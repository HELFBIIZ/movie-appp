// src/lib/db.mjs — SINGLE server-side data access layer.
//
// Engine: libSQL (@libsql/client) — the Turso SQLite-compatible HTTP client.
//   • local   → `file:data/db/app.db` (same schema/data as before; WAL)
//   • remote  → `TURSO_DATABASE_URL` (libsql:// or https://) + TURSO_AUTH_TOKEN
// The driver is async; every function here returns a promise. Transactions that
// previously used better-sqlite3 db.transaction() now use the atomic
// client.batch(…, 'write') — the write set is committed atomically on Turso.
//
// SECURITY CONTRACT (non-negotiable for this whole app):
//   • This module is the ONLY place that constructs SQL. Routes never inline
//     raw SQL into handlers.
//   • Every mutating statement is a prepared statement + bound parameters →
//     SQL injection is structurally impossible here, not merely mitigated.
//   • Every HANDLER that needs server-side authority imports `guard` helpers.
//   • No secrets, no env passwords, no payment keys ever get serialized into
//     anything served to the browser.
//   • All writes funnel through atomic batch transactions (libSQL is ACID) so
//     half-applied XP/payment/sub scribbles don't exist.
import 'server-only'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { createClient } from '@libsql/client'

const DATA_DIR = path.join(process.cwd(), 'data', 'db')
const DB_FILE = path.join(DATA_DIR, 'app.db')
const SCHEMA_FILE = path.join(DATA_DIR, 'schema.sql')
const SEED_FILE = path.join(DATA_DIR, 'seeds.sql')
const REMOTE_URL = (process.env.TURSO_DATABASE_URL || '').trim()
const REMOTE_TOKEN = process.env.TURSO_AUTH_TOKEN || ''
const isRemote = !!REMOTE_URL

if (!isRemote) fs.mkdirSync(DATA_DIR, { recursive: true })

/** Normalise args for libSQL (better-sqlite3 tolerated undefined; libSQL needs null). */
const norm = (v) => (v === undefined ? null : v)

let _client = null
let _ready = null
/** Lazy async client init. Boots schema (local) and flex plans on first use. */
async function getClient() {
  if (_client) return _client
  if (!_ready) {
    _ready = (async () => {
      const url = isRemote ? REMOTE_URL : `file:${DB_FILE}`
      const client = createClient({ url, authToken: isRemote ? REMOTE_TOKEN : undefined })
      if (!isRemote) {
        if (!fs.existsSync(SCHEMA_FILE)) throw new Error(`Missing schema file: ${SCHEMA_FILE}`)
        await client.executeMultiple(fs.readFileSync(SCHEMA_FILE, 'utf8'))
        if (fs.existsSync(SEED_FILE)) await client.executeMultiple(fs.readFileSync(SEED_FILE, 'utf8'))
      } else {
        // Remote DB is self-healing for a fresh namespace: bootstrap tables +
        // seeds when empty (data itself gets copied by scripts/turso-migrate.mjs).
        const probe = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1`)
        if (!probe.rows.length) {
          if (!fs.existsSync(SCHEMA_FILE)) throw new Error(`Missing schema file: ${SCHEMA_FILE}`)
          await client.executeMultiple(fs.readFileSync(SCHEMA_FILE, 'utf8'))
          if (fs.existsSync(SEED_FILE)) await client.executeMultiple(fs.readFileSync(SEED_FILE, 'utf8'))
        }
      }
      await ensureFlexiblePlans(client)
      _client = client
    })()
  }
  await _ready
  return _client
}

/** Run a query and return the whole result set. */
async function qAll(sql, args = []) {
  const client = await getClient()
  const r = await client.execute({ sql, args: args.map(norm) })
  return r.rows || []
}
/** Run a query and return the first row (or null). */
async function qOne(sql, args = []) {
  const rows = await qAll(sql, args)
  return rows[0] || null
}
/** Run a single write statement; returns the libSQL result. */
async function qRun(sql, args = []) {
  const client = await getClient()
  return client.execute({ sql, args: args.map(norm) })
}
/** Atomic write batch — the Turso replacement for db.transaction(). */
async function batchWrite(statements) {
  const client = await getClient()
  return client.batch(statements.map((s) => ({ sql: s.sql, args: (s.args || []).map(norm) })), 'write')
}

// Flexible multi-month paid plans (2…9 months) priced on the same monthly rate
// as the seeded MONTHLY plan: 30 days * n, 5900 MNT * n. Data is derived, so
// the annual/quarterly rows stay authoritative and nothing needs a migration
// when the monthly rate changes — re-run computes from the live MONTHLY row.
async function ensureFlexiblePlans(client) {
  try {
    const base = (await client.execute(`SELECT price_mnt AS priceMnt FROM subscription_plans WHERE code = 'MONTHLY' AND is_active = 1`)).rows[0]
    if (!base) return
    const stmts = []
    for (let n = 2; n <= 9; n++) {
      stmts.push({
        sql: `INSERT OR IGNORE INTO subscription_plans (id, code, name, price_mnt, duration_days, is_active)
              VALUES (?, ?, ?, ?, ?, 1)`,
        args: [`pl_mnth${n}`, `MONTHLY_${n}`, `Flexible ${n} Months Unlimited`, base.priceMnt * n, 30 * n],
      })
    }
    await client.batch(stmts, 'write')
  } catch { /* plans table missing on first boot before seed — ignore */ }
}

/** Public accessor (async). Internal + xp.mjs + dev probes use this. */
export async function getDb() {
  return getClient()
}
// ────────────────────────────────────────────────────────────────────────
// HASHING — password/credential storage. Use scrypt (memory-hard, salted).
// NEVER store plaintext, NEVER store a single unsalted SHA-equivalent.
// ────────────────────────────────────────────────────────────────────────
const SCRYPT_N = 16384 // 14 bits — OWASP balance for fast interactive login
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64
export function hashSecret(secret) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(secret, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P,
  }).toString('hex')
  return `scrypt$${salt}$${hash}`
}
export function verifySecret(stored, secret) {
  if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false
  const [, salt, hash] = stored.split('$')
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(secret, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P,
  }).toString('hex')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(candidate, 'hex')
    )
  } catch {
    return false
  }
}
/**
 * Insert a user with server-side checks + a transactional XP grant for
 * signup. Returns the new user row or a typed error (never throws raw).
 */
export async function createUser({ email, username, password }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'INVALID_EMAIL' }
  }
  if (!/^[\p{L}\p{N}_-]{3,24}$/u.test(username)) {
    return { error: 'INVALID_USERNAME' }
  }
  if (typeof password !== 'string' || password.length < 8) {
    return { error: 'WEAK_PASSWORD' }
  }
  const existing = await qOne(
    'SELECT id, email, username FROM users WHERE email = ? OR username = ?',
    [email, username]
  )
  if (existing?.email === email) return { error: 'EMAIL_TAKEN' }
  if (existing?.username === username) return { error: 'USERNAME_TAKEN' }
  const passwordHash = hashSecret(password)
  const userId = crypto.randomUUID()
  // signup XP + streak row + buying the DEFAULT FREE role all server-side in
  // ONE atomic commit — a user arriving via the client can't partial-write.
  await batchWrite([
    {
      sql: `INSERT INTO users (id, email, username, password_hash, role_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, (SELECT id FROM roles WHERE code='USER'), datetime('now'), datetime('now'))`,
      args: [userId, email, username, passwordHash],
    },
    {
      sql: `INSERT INTO profiles (id, user_id, avatar_url, display_name, created_at)
            VALUES (?, ?, NULL, ?, datetime('now'))`,
      args: [crypto.randomUUID(), userId, username],
    },
    {
      sql: `INSERT OR IGNORE INTO xp_accounts (id, user_id, xp, level, streak_days)
            VALUES (?, ?, ?, 1, 0)`,
      args: [userId, userId, 50],
    },
    {
      sql: `INSERT INTO xp_transactions (id, user_id, activity, amount, reason, created_at)
            VALUES (?, ?, 'SIGNUP', 50, 'Account created', datetime('now'))`,
      args: [crypto.randomUUID(), userId],
    },
    {
      sql: `INSERT OR IGNORE INTO login_streaks (id, user_id, current, best, last_login_date)
            VALUES (?, ?, 0, 0, NULL)`,
      args: [userId, userId],
    },
  ])
  const user = await qOne(
    `SELECT id, email, username, role_id AS roleId, created_at AS createdAt
     FROM users WHERE id = ?`,
    [userId]
  )
  return { user, xp: { gained: 50, level: 1, status: 'ok' } }
}
/** Fetch a user by email/username with their current XP + streak (for login). */
export async function findUserForLogin(identifier) {
  return qOne(
    `SELECT u.id, u.email, u.username, u.password_hash AS passwordHash,
            u.role_id AS roleId, r.code AS roleCode,
            UPPER(u.email) = ? AS isEmail
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.email = ? OR u.username = ? LIMIT 1`,
    [identifier.toUpperCase(), identifier, identifier]
  )
}
// ────────────────────────────────────────────────────────────────────────
// SESSIONS — httpOnly, signed, expiring, server-stored (revocable).
// Client JS can never read the cookie; fetch of a fresh value returns its
// payload only after server re-verification. A logged-out user's session is
// deleted server-side — no trusting `SignedOut` flags stored in a cookie.
// ────────────────────────────────────────────────────────────────────────
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const COOKIE_NAME = 'mn_session'
/** Deterministic token hash for sessions — sha256, per the schema comment.
 *  (hashSecret is salted-scrypt and is therefore NON-reproducible; it must
 *  never be used for tokens we need to look up again.) */
function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}
export async function createSession(userId, token = crypto.randomBytes(32).toString('base64url')) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await qRun(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [crypto.randomUUID(), userId, hashSessionToken(token), expiresAt.toISOString()]
  )
  return { token, expiresAt }
}
/** Server-side session lookup — throws nothing, returns user payload or null. */
export async function getUserBySessionToken(token) {
  if (!token || typeof token !== 'string') return null
  return qOne(
    `SELECT s.id AS sessionId, u.id, u.email, u.username,
            r.code AS roleCode, u.role_id AS roleId
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN roles r ON r.id = u.role_id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now') LIMIT 1`,
    [hashSessionToken(token)]
  )
}
export async function deleteSession(token) {
  if (!token) return
  await qRun('DELETE FROM sessions WHERE token_hash = ?', [hashSessionToken(token)])
}
export function buildSessionCookie(token, expiresAt) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor((expiresAt.getTime() - Date.now()) / 1000)}`
}
export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}
// ────────────────────────────────────────────────────────────────────────
// AUTH GUARD HELPERS — every protected handler uses these, never raw bools.
// ────────────────────────────────────────────────────────────────────────
export async function requireUser(token) {
  const user = await getUserBySessionToken(token)
  if (!user) return { error: { status: 401, code: 'UNAUTHENTICATED' } }
  return { user }
}
export async function requireRole(token, ...roles) {
  const { user, error } = await requireUser(token)
  if (error) return { error }
  if (!roles.includes(user.roleCode)) {
    return { error: { status: 403, code: 'FORBIDDEN', role: user.roleCode } }
  }
  return { user }
}
// ────────────────────────────────────────────────────────────────────────
// RATE LIMITING — server-side brute force / abuse protection.
// In-memory, per-key buckets; production swaps to same interface on Redis.
// Prevent: brute force logins, XP-farm bursts, payment callback replay.
// ────────────────────────────────────────────────────────────────────────
const buckets = new Map()
const WINDOW_MS = 60_000
export function rateLimit(key, { max, windowMs = WINDOW_MS } = {}) {
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || now - b.until > windowMs) {
    b = { count: 0, until: now + windowMs }
    buckets.set(key, b)
  }
  b.count++
  const remaining = b.count > max ? 0 : max - b.count
  const resetIn = Math.max(0, Math.ceil((b.until - now) / 1000))
  if (b.count > max) {
    return { limited: true, retryAfterSeconds: resetIn, remaining: 0 }
  }
  return { limited: false, remaining, retryAfterSeconds: resetIn }
}
// ────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION GATE — the ONLY source of truth for "can this user watch?".
// Client can serve whichever player it likes; whether the USER is allowed is
// decided here, server-side, per request, never by a frontend flag.
// ────────────────────────────────────────────────────────────────────────
export async function getActiveSubscription(userId) {
  return qOne(
    `SELECT s.id, s.status, s.start_date AS startDate, s.expires_at AS expiresAt,
            s.plan_id AS planId, p.code AS planCode, p.name AS planName,
            p.price_mnt AS priceMnt, p.duration_days AS durationDays
     FROM subscriptions s
     JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.user_id = ? AND s.status = 'ACTIVE'
       AND s.expires_at > datetime('now')
     ORDER BY s.expires_at DESC LIMIT 1`,
    [userId]
  )
}
/**
 * Server-verified access decision for a title. Returns { allowed, reason }.
 * allowed=true only when an ACTIVE + unexpired subscription exists — or the
 * title is FREE (rented/one-off without a sub requires a per-title payment
 * that we deliberately gate in the payment wiring step).
 */
export async function canWatch(userId, movie, sub = null) {
  if (!movie) return { allowed: false, reason: 'NO_MOVIE' }
  if (movie.access === 'FREE') return { allowed: true, reason: 'FREE' }
  const active = sub || (userId ? await getActiveSubscription(userId) : null)
  if (!active) return { allowed: false, reason: 'NO_ACTIVE_SUBSCRIPTION' }
  if (active.status !== 'ACTIVE') return { allowed: false, reason: active.status }
  if (new Date(active.expiresAt).getTime() <= Date.now()) {
    return { allowed: false, reason: 'SUBSCRIPTION_EXPIRED' }
  }
  return { allowed: true, reason: 'SUBSCRIPTION' }
}

// ────────────────────────────────────────────────────────────────────────
// XP / PROFILE READS + WATCH HISTORY + SECURITY LOG — the read + audit side
// of the gamification & security surfaces. Writes (awardXp, flipLoginStreak)
// live in xp.mjs on the SAME client so rows never half-apply.
// ────────────────────────────────────────────────────────────────────────
export async function getXpProfile(userId) {
  const acc = await qOne(
    `SELECT xp, level, streak_days AS streakDays, last_streak_date AS lastStreakDate
     FROM xp_accounts WHERE user_id = ?`,
    [userId]
  )
  const streak = await qOne(
    `SELECT current, best, last_login_date AS lastLoginDate FROM login_streaks WHERE user_id = ?`,
    [userId]
  )
  return {
    xp: acc?.xp ?? 0,
    level: acc?.level ?? 1,
    streakDays: streak?.current ?? acc?.streakDays ?? 0,
    bestStreak: streak?.best ?? 0,
    lastLoginDate: streak?.lastLoginDate ?? null,
  }
}
export async function listXpTransactions(userId, limit = 8) {
  return qAll(
    `SELECT activity, amount, reason, created_at AS createdAt
     FROM xp_transactions WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    [userId, limit]
  )
}
export async function upsertWatchRecord({ userId, slug, progress = 0, completed = false }) {
  await qRun(
    `INSERT INTO watch_history (id, user_id, slug, progress, completed, watched_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, slug) DO UPDATE SET
       progress = MAX(watch_history.progress, excluded.progress),
       completed = MAX(watch_history.completed, excluded.completed),
       watched_at = datetime('now')`,
    [crypto.randomUUID(), userId, slug, progress, completed ? 1 : 0]
  )
  return { ok: true }
}
export async function logSecurity({ userId = null, type, detail = null, ip = null }) {
  await qRun(
    `INSERT INTO security_logs (id, user_id, type, detail, ip, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [crypto.randomUUID(), userId, type, detail, ip ?? null]
  )
}
// ────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION PLANS + REWARDS SHOP (read) — public catalog surfaces.
// ────────────────────────────────────────────────────────────────────────
export async function listSubscriptionPlans({ paidOnly = true } = {}) {
  const extra = paidOnly ? ` AND price_mnt > 0 ` : ''
  return qAll(
    `SELECT id, code, name, price_mnt AS priceMnt, duration_days AS durationDays
     FROM subscription_plans WHERE is_active = 1${extra} ORDER BY price_mnt ASC`
  )
}
export async function listRewards() {
  return qAll(
    `SELECT id, code, type, name, description, xp_price AS xpPrice, days
     FROM rewards WHERE is_active = 1 ORDER BY xp_price ASC`
  )
}
export async function listMyRewards(userId) {
  return qAll(
    `SELECT r.code, r.type, r.name, r.xp_price AS xpPrice, ur.activated, ur.purchased_at AS purchasedAt
     FROM user_rewards ur JOIN rewards r ON r.id = ur.reward_id WHERE ur.user_id = ?`,
    [userId]
  )
}
// ────────────────────────────────────────────────────────────────────────
// REVIEWS — server-persisted ratings/reviews (replaces the localStorage-only
// guest flow). One row per (user, slug); rating 1–5 + optional text.
// ────────────────────────────────────────────────────────────────────────
export async function upsertReview({ userId, slug, rating, text = null }) {
  await qRun(
    `INSERT INTO reviews (id, user_id, slug, rating, text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(user_id, slug) DO UPDATE SET
       rating = excluded.rating,
       text   = COALESCE(excluded.text, reviews.text),
       updated_at = datetime('now')`,
    [crypto.randomUUID(), userId, slug, rating, text]
  )
  return qOne(
    `SELECT id, slug, rating, text, created_at AS createdAt, updated_at AS updatedAt
     FROM reviews WHERE user_id = ? AND slug = ?`,
    [userId, slug]
  )
}
export async function getReviewsBySlug(slug) {
  return qAll(
    `SELECT r.slug, r.rating, r.text, r.created_at AS createdAt, u.username
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.slug = ? ORDER BY r.updated_at DESC`,
    [slug]
  )
}
async function getRewardByCode(code) {
  return qOne(
    `SELECT id, code, type, name, description, xp_price AS xpPrice, days, is_active AS isActive
     FROM rewards WHERE code = ?`,
    [code]
  )
}
export async function getPlanById(planId) {
  return qOne(
    `SELECT id, code, name, price_mnt AS priceMnt, duration_days AS durationDays
     FROM subscription_plans WHERE id = ?`,
    [planId]
  )
}
// ────────────────────────────────────────────────────────────────────────
// PAYMENTS — the activate path. truthful gateways only:
//   • local_dev auto-approves (sandbox: lets the team run end-to-end without
//     a merchant credential).
//   • qpay / bank rows start PENDING and are flipped ONLY by a signed
//     webhook (see api/webhooks/*), never by the client.
// Replay-safe: a SUCCESSFUL txn is a no-op.
// ────────────────────────────────────────────────────────────────────────
export async function createPayment({ userId, planId, amountMnt, provider = 'local_dev', providerRef = null }) {
  const txnId = `tx_${crypto.randomUUID()}`
  await qRun(
    `INSERT INTO payments (id, txn_id, user_id, plan_id, amount_mnt, currency, status, provider, provider_ref, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'MNT', 'PENDING', ?, ?, datetime('now'), datetime('now'))`,
    [crypto.randomUUID(), txnId, userId, planId, amountMnt, provider, providerRef]
  )
  return getPaymentByTxn(txnId)
}
export async function getPaymentByTxn(txnId) {
  return qOne(
    `SELECT id, txn_id AS txnId, user_id AS userId, plan_id AS planId, amount_mnt AS amountMnt,
            currency, status, provider, provider_ref AS providerRef, verified_at AS verifiedAt
     FROM payments WHERE txn_id = ?`,
    [txnId]
  )
}
/** Stash the gateway's own reference on a PENDING payment (e.g. QPay invoice_id). */
export async function setPaymentProviderRef(txnId, providerRef) {
  await qRun(
    `UPDATE payments SET provider_ref = ?, updated_at = datetime('now') WHERE txn_id = ? AND status = 'PENDING'`,
    [providerRef, txnId]
  )
}
/** Find a payment by the provider's own reference (QPay invoice_id etc.). */
export async function findPaymentByProviderRef(providerRef) {
  return qOne(
    `SELECT id, txn_id AS txnId, user_id AS userId, plan_id AS planId, amount_mnt AS amountMnt,
            currency, status, provider, provider_ref AS providerRef, verified_at AS verifiedAt
     FROM payments WHERE provider_ref = ?`,
    [providerRef]
  )
}
// ────────────────────────────────────────────────────────────────────────
// MANUAL RECEIPTS (Khan Bank transfer) — user submits phone + optional
// screenshot against a PENDING bank payment; an ADMIN approves/rejects.
// Approval reuses activatePaymentSuccess so expiry stacking is identical.
// ────────────────────────────────────────────────────────────────────────
export async function createManualReceipt({ txnId, userId, phone, note = null, imageData = null }) {
  await qRun(
    `INSERT INTO payment_receipts (id, txn_id, user_id, phone, note, image_data, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'))`,
    [crypto.randomUUID(), txnId, userId, phone, note, imageData]
  )
  return getReceiptByTxn(txnId)
}
export async function getReceiptByTxn(txnId) {
  return qOne(
    `SELECT id, txn_id AS txnId, user_id AS userId, phone, note, image_data AS imageData, status,
            admin_note AS adminNote, reviewed_by AS reviewedBy, reviewed_at AS reviewedAt,
            created_at AS createdAt
     FROM payment_receipts WHERE txn_id = ?`,
    [txnId]
  )
}
export async function listReceipts({ status = null, limit = 100 } = {}) {
  const sql = `SELECT r.id, r.txn_id AS txnId, r.phone, r.note, r.image_data AS imageData, r.status,
                r.admin_note AS adminNote, r.reviewed_at AS reviewedAt, r.created_at AS createdAt,
                u.username, u.email,
                p.amount_mnt AS amountMnt, p.status AS paymentStatus,
                pl.code AS planCode, pl.name AS planName, pl.duration_days AS durationDays
         FROM payment_receipts r
         JOIN users u ON u.id = r.user_id
         JOIN payments p ON p.txn_id = r.txn_id
         JOIN subscription_plans pl ON pl.id = p.plan_id
         ${status ? `WHERE r.status = ?` : ``}
         ORDER BY r.created_at DESC LIMIT ?`
  return qAll(sql, status ? [status, limit] : [limit])
}
export async function updateReceiptStatus({ txnId, status, adminNote = null, reviewedBy = null }) {
  await qRun(
    `UPDATE payment_receipts
     SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now')
     WHERE txn_id = ?`,
    [status, adminNote, reviewedBy, txnId]
  )
  return getReceiptByTxn(txnId)
}
/** Mark a payment FAILED (rejected transfer) — safe no-op once SUCCESSFUL. */
export async function rejectPayment(txnId) {
  await qRun(
    `UPDATE payments SET status = 'FAILED', updated_at = datetime('now')
     WHERE txn_id = ? AND status != 'SUCCESSFUL'`,
    [txnId]
  )
  return getPaymentByTxn(txnId)
}
// ────────────────────────────────────────────────────────────────────────
// ADMIN OVERVIEW — cross-table rollups for the /admin dashboard. Pure reads;
// every number is recomputed per request (no stale materialized counters).
// ────────────────────────────────────────────────────────────────────────
export async function adminOverview() {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const n = (row, col) => row?.[col] ?? 0
  const sum = (row, col) => row?.[col] ?? 0
  const one = (sql, ...args) => qOne(sql, args)
  const all = (sql, ...args) => qAll(sql, args)

  const stats = {
    users: n(await one(`SELECT COUNT(*) AS c FROM users WHERE deleted_at IS NULL`), 'c'),
    activeSubscriptions: n(await one(
      `SELECT COUNT(*) AS c FROM subscriptions WHERE status = 'ACTIVE' AND datetime(expires_at) > datetime(?)`, now
    ), 'c'),
    revenueMnt: sum(await one(`SELECT COALESCE(SUM(amount_mnt), 0) AS s FROM payments WHERE status = 'SUCCESSFUL'`), 's'),
    successfulPayments: n(await one(`SELECT COUNT(*) AS c FROM payments WHERE status = 'SUCCESSFUL'`), 'c'),
    pendingReceipts: n(await one(`SELECT COUNT(*) AS c FROM payment_receipts WHERE status = 'PENDING'`), 'c'),
    totalXp: sum(await one(`SELECT COALESCE(SUM(xp), 0) AS s FROM xp_accounts`), 's'),
    reviews: n(await one(`SELECT COUNT(*) AS c FROM reviews`), 'c'),
    watchHistory: n(await one(`SELECT COUNT(*) AS c FROM watch_history`), 'c'),
  }

  return {
    stats,
    recent: {
      users: await all(`SELECT id, email, username, created_at AS createdAt FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5`),
      payments: await all(`SELECT txn_id AS txnId, amount_mnt AS amountMnt, status, provider, created_at AS createdAt FROM payments ORDER BY created_at DESC LIMIT 6`),
      topXp: await all(`SELECT u.username, x.xp, x.level FROM xp_accounts x JOIN users u ON u.id = x.user_id ORDER BY x.xp DESC LIMIT 5`),
      receipts: await all(
        `SELECT r.txn_id AS txnId, r.status, r.created_at AS createdAt, u.username, p.amount_mnt AS amountMnt
         FROM payment_receipts r JOIN users u ON u.id = r.user_id JOIN payments p ON p.txn_id = r.txn_id
         ORDER BY r.created_at DESC LIMIT 5`),
      reviews: await all(
        `SELECT r.slug, r.rating, r.text, r.created_at AS createdAt, u.username
         FROM reviews r JOIN users u ON u.id = r.user_id ORDER BY r.updated_at DESC LIMIT 5`),
    },
  }
}
/**
 * Flip a PENDING/PROCESSING payment to SUCCESSFUL and materialise the
 * subscription in the SAME commit: new ACTIVE row whose expiry is stacked on
 * any still-valid one (renewal never shortens access). Also records the
 * payment method + a security-log line. Idempotent + replay-safe.
 */
export async function activatePaymentSuccess(txnId) {
  const payment = await getPaymentByTxn(txnId)
  if (!payment) return { error: { code: 'UNKNOWN_TXN' } }
  if (payment.status === 'SUCCESSFUL') return { payment, alreadyActivated: true }
  if (!['PENDING', 'PROCESSING'].includes(payment.status)) {
    return { error: { code: 'INVALID_PAYMENT_STATE', status: payment.status } }
  }
  const plan = await getPlanById(payment.planId)
  if (!plan) return { error: { code: 'UNKNOWN_PLAN' } }
  const now = new Date()
  const active = await getActiveSubscription(payment.userId)
  const base = active && new Date(active.expiresAt) > now ? new Date(active.expiresAt) : now
  const expiresAt = addDays(base, plan.durationDays)

  const res = await batchWrite([
    {
      sql: `UPDATE payments SET status = 'SUCCESSFUL', verified_at = datetime('now'), updated_at = datetime('now')
            WHERE txn_id = ? AND status != 'SUCCESSFUL'`,
      args: [txnId],
    },
    {
      sql: `INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, expires_at, created_at, updated_at)
            VALUES (?, ?, ?, 'ACTIVE', ?, ?, datetime('now'), datetime('now'))`,
      args: [crypto.randomUUID(), payment.userId, plan.id, now.toISOString(), expiresAt.toISOString()],
    },
    {
      sql: `INSERT INTO payment_methods (id, user_id, provider, token, last4, is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, NULL, 1, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET is_default = 1`,
      args: [`pm:${payment.userId}:${payment.provider}`, payment.userId, payment.provider, payment.providerRef || txnId],
    },
    {
      sql: `INSERT INTO security_logs (id, user_id, type, detail, ip, created_at)
            VALUES (?, ?, 'payment-verify', ?, NULL, datetime('now'))`,
      args: [crypto.randomUUID(), payment.userId, `${plan.code} activated via ${payment.provider} (${txnId})`],
    },
  ])
  return { payment: await getPaymentByTxn(txnId), subscription: await getActiveSubscription(payment.userId) }
}
/** Grant a VIP pass without a payment row (XP redemption). Stacks on expiry. Returns the fresh ACTIVE subscription. */
export async function grantVipPass({ userId, days, source = 'XP_REDEEM' }) {
  const plan = await qOne(
    `SELECT id, code, name, price_mnt AS priceMnt, duration_days AS durationDays
     FROM subscription_plans WHERE price_mnt = 0 AND duration_days = ? AND is_active = 1 ORDER BY duration_days LIMIT 1`,
    [days]
  )
  if (!plan) return { error: { code: 'UNKNOWN_VIP_PLAN' } }
  const now = new Date()
  const active = await getActiveSubscription(userId)
  const base = active && new Date(active.expiresAt) > now ? new Date(active.expiresAt) : now
  const expiresAt = addDays(base, days)
  await batchWrite([
    {
      sql: `INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, expires_at, created_at, updated_at)
            VALUES (?, ?, ?, 'ACTIVE', ?, ?, datetime('now'), datetime('now'))`,
      args: [crypto.randomUUID(), userId, plan.id, now.toISOString(), expiresAt.toISOString()],
    },
    {
      sql: `INSERT INTO security_logs (id, user_id, type, detail, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))`,
      args: [crypto.randomUUID(), userId, 'redeem', `${source}: +${days}d VIP (${plan.code})`],
    },
  ])
  return { subscription: await getActiveSubscription(userId), plan }
}
/**
 * Spend XP on a reward — one atomic commit: deduct balance, ledger a negative
 * XP tx, record redemption + ownership, and for `feature` rewards materialise
 * the VIP pass immediately. Everything funnels through db.mjs prepared SQL.
 */
export async function redeemReward({ userId, code, ip = null }) {
  const reward = await getRewardByCode(code)
  if (!reward) return { error: { code: 'UNKNOWN_REWARD' } }
  if (!reward.isActive) return { error: { code: 'REWARD_INACTIVE' } }
  const already = await qOne('SELECT id FROM user_rewards WHERE user_id = ? AND reward_id = ?', [userId, reward.id])
  if (already) return { error: { code: 'REWARD_OWNED' } }
  const balance = (await qOne('SELECT xp FROM xp_accounts WHERE user_id = ?', [userId]))?.xp ?? 0
  if (balance < reward.xpPrice) {
    return { error: { code: 'XP_INSUFFICIENT', balance, needed: reward.xpPrice } }
  }

  const stmts = [
    {
      sql: `UPDATE xp_accounts SET xp = xp - ?, updated_at = datetime('now') WHERE user_id = ? AND xp >= ?`,
      args: [reward.xpPrice, userId, reward.xpPrice],
    },
    {
      sql: `INSERT INTO xp_transactions (id, user_id, activity, amount, reason, created_at)
            VALUES (?, ?, 'XP_REDEEM', ?, ?, datetime('now'))`,
      args: [crypto.randomUUID(), userId, -reward.xpPrice, reward.name],
    },
    {
      sql: `INSERT INTO xp_redemptions (id, user_id, reward_id, xp_spent, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))`,
      args: [crypto.randomUUID(), userId, reward.id, reward.xpPrice],
    },
    {
      sql: `INSERT INTO user_rewards (id, user_id, reward_id, purchased_at, activated)
            VALUES (?, ?, ?, datetime('now'), 0)`,
      args: [crypto.randomUUID(), userId, reward.id],
    },
    {
      sql: `INSERT INTO security_logs (id, user_id, type, detail, ip, created_at)
            VALUES (?, ?, 'redeem', ?, ?, datetime('now'))`,
      args: [crypto.randomUUID(), userId, `Reward ${reward.code} (${reward.xpPrice} XP)`, ip],
    },
  ]
  let sub = null
  if (reward.type === 'feature' && reward.days > 0) {
    const granted = await qOne(
      `SELECT id, code FROM subscription_plans WHERE price_mnt = 0 AND duration_days = ? AND is_active = 1 ORDER BY duration_days LIMIT 1`,
      [reward.days]
    )
    if (granted) {
      const now = new Date()
      const active = await getActiveSubscription(userId)
      const base = active && new Date(active.expiresAt) > now ? new Date(active.expiresAt) : now
      const expiresAt = addDays(base, reward.days)
      stmts.push({
        sql: `INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, expires_at, created_at, updated_at)
              VALUES (?, ?, ?, 'ACTIVE', ?, ?, datetime('now'), datetime('now'))`,
        args: [crypto.randomUUID(), userId, granted.id, now.toISOString(), expiresAt.toISOString()],
      })
    }
  }
  await batchWrite(stmts)
  sub = await getActiveSubscription(userId)
  return { ok: true, reward: { code: reward.code, name: reward.name, type: reward.type, days: reward.days }, xpBalance: (balance - reward.xpPrice), subscription: sub }
}
function addDays(date, days) {
  const d = new Date(date.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

// ────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — in-app bell. Every payment event fans out here: a new
// receipt → every ADMIN gets one; an approval/rejection → the buyer gets one;
// a QPay full-payment auto-detect → the buyer gets one. Read-only for the
// recipient; the bell polls GET /api/notifications.
// ────────────────────────────────────────────────────────────────────────
export async function createNotification({ userId, type, title, body, link = null }) {
  await qRun(
    `INSERT INTO notifications (id, user_id, type, title, body, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [crypto.randomUUID(), userId, type, title, body, link]
  )
  return qOne(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [userId])
}
export async function listNotifications(userId, { unreadOnly = false, limit = 50 } = {}) {
  const where = unreadOnly ? `WHERE user_id = ? AND read_at IS NULL` : `WHERE user_id = ?`
  return qAll(
    `SELECT id, type, title, body, link, read_at AS readAt, created_at AS createdAt
     FROM notifications ${where} ORDER BY created_at DESC LIMIT ?`,
    [userId, limit]
  )
}
export async function unreadNotificationsCount(userId) {
  const row = await qOne(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`, [userId])
  return row?.n ?? 0
}
/** ids = null → mark ALL read. Otherwise only the listed ids (owner-guarded). */
export async function markNotificationsRead(userId, ids = null) {
  if (!ids || !ids.length) {
    await qRun(`UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL`, [userId])
  } else {
    const placeholders = ids.map(() => '?').join(',')
    await qRun(
      `UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND id IN (${placeholders}) AND read_at IS NULL`,
      [userId, ...ids]
    )
  }
  return unreadNotificationsCount(userId)
}
/** Every active admin's user id — used to fan out "new payment needs review". */
export async function listAdminUserIds() {
  const rows = await qAll(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.code IN ('ADMIN', 'SUPER_ADMIN') AND u.deleted_at IS NULL`
  )
  return (rows || []).map((r) => r.id)
}
// ────────────────────────────────────────────────────────────────────────
// ADMIN USER MANAGEMENT — list, role lookup, revoke, ban/restore.
// ────────────────────────────────────────────────────────────────────────
export async function getUserRoleByUserId(userId) {
  return qOne(
    `SELECT u.id, u.email, u.username, r.code AS roleCode
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`, [userId])
}
export async function listUsers({ search = '', includeDeleted = false } = {}) {
  const clauses = [], args = []
  if (!includeDeleted) clauses.push('u.deleted_at IS NULL')
  const query = String(search || '').trim()
  if (query) {
    clauses.push('(LOWER(u.email) LIKE ? OR LOWER(u.username) LIKE ?)')
    const pattern = `%${query.toLowerCase()}%`
    args.push(pattern, pattern)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  return qAll(`
    WITH active_subscriptions AS (
      SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY datetime(s.expires_at) DESC, s.id DESC) AS rn
      FROM subscriptions s WHERE s.status = 'ACTIVE' AND datetime(s.expires_at) > datetime('now')
    ),
    pending_payments AS (
      SELECT pay.user_id, pay.txn_id AS pendingTxnId,
             ROW_NUMBER() OVER (PARTITION BY pay.user_id ORDER BY datetime(pay.created_at) DESC) AS prn
      FROM payments pay WHERE pay.status IN ('PENDING','PROCESSING') AND pay.provider = 'bank'
    )
    SELECT u.id, u.email, u.username, r.code AS roleCode,
           u.deleted_at AS deletedAt, u.created_at AS createdAt,
           s.status AS subscriptionStatus, s.expires_at AS subscriptionExpiresAt,
           p.code AS planCode, p.name AS planName,
           COUNT(DISTINCT CASE WHEN pay.status='SUCCESSFUL' AND pay.provider IN ('bank','qpay') THEN pay.id END) AS verifiedPayments,
           COUNT(DISTINCT CASE WHEN pay.status='SUCCESSFUL' AND pay.provider='local_dev' THEN pay.id END) AS demoPayments,
           pp.pendingTxnId
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN active_subscriptions s ON s.user_id = u.id AND s.rn = 1
    LEFT JOIN subscription_plans p ON p.id = s.plan_id
    LEFT JOIN payments pay ON pay.user_id = u.id
    LEFT JOIN pending_payments pp ON pp.user_id = u.id AND pp.prn = 1
    ${where}
    GROUP BY u.id, s.id, pp.pendingTxnId
    ORDER BY u.created_at DESC
  `, args)
}
export async function revokeUserSubscriptions({ userId, reviewedBy = null } = {}) {
  const active = await qAll(
    `SELECT s.id, p.code AS planCode FROM subscriptions s
     JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.user_id = ? AND s.status = 'ACTIVE' AND p.price_mnt > 0`, [userId])
  if (!active.length) return { count: 0, subscriptions: [] }
  const writes = []
  for (const sub of active) {
    writes.push({ sql: `UPDATE subscriptions SET status='REVOKED', updated_at=datetime('now') WHERE id=?`, args: [sub.id] })
    writes.push({ sql: `INSERT INTO security_logs (id,user_id,type,detail,ip,created_at) VALUES (?,?,'subscription-revoke',?,NULL,datetime('now'))`,
      args: [crypto.randomUUID(), userId, `${sub.planCode} revoked by ${reviewedBy||'admin'}`] })
  }
  writes.push({ sql: `INSERT INTO notifications (id,user_id,type,title,body,link,created_at) VALUES (?,?,'info','VIP эрх цуцлагдлаа','Демо төлбөр эсвэл баталгаажаагүй төлбөрөөр идэвхжсэн VIP эрхийг админ цуцаллаа.','/pricing',datetime('now'))`,
    args: [crypto.randomUUID(), userId] })
  await batchWrite(writes)
  return { count: active.length, subscriptions: active }
}
export async function setUserDeleted({ userId, deleted, reviewedBy }) {
  const target = await qOne(`SELECT id, email, username FROM users WHERE id=?`, [userId])
  if (!target) return { error: { code: 'USER_NOT_FOUND', status: 404 } }
  if (deleted) await revokeUserSubscriptions({ userId, reviewedBy })
  await qRun(`UPDATE users SET deleted_at=?, updated_at=datetime('now') WHERE id=?`, [deleted ? new Date().toISOString() : null, userId])
  if (deleted) await qRun(`DELETE FROM sessions WHERE user_id=?`, [userId])
  await qRun(`INSERT INTO security_logs (id,user_id,type,detail,ip,created_at) VALUES (?,?,?,NULL,datetime('now'))`,
    [crypto.randomUUID(), userId, deleted?'user-ban':'user-restore', `${target.email} ${deleted?'banned':'restored'} by ${reviewedBy}`])
  return { user: { ...target, deleted } }
}
/** A user's own still-pending QPay payments that have a live invoice ref. */
export async function listUserPendingQpay(userId) {
  return qAll(
    `SELECT txn_id AS txnId, provider_ref AS providerRef, amount_mnt AS amountMnt
     FROM payments WHERE user_id = ? AND provider = 'qpay' AND status = 'PENDING'
       AND provider_ref IS NOT NULL ORDER BY created_at DESC LIMIT 20`,
    [userId]
  )
}

/** Global pending QPay sweep for the Cron route + qpay-watcher parity. */
export async function listPendingQpay({ maxAgeHours = 48 } = {}) {
  return qAll(
    `SELECT txn_id AS txnId, provider_ref AS providerRef, amount_mnt AS amountMnt
     FROM payments WHERE provider = 'qpay' AND status = 'PENDING' AND provider_ref IS NOT NULL
       AND datetime(created_at) > datetime('now', ?)`,
    [`-${maxAgeHours} hours`]
  )
}

// ────────────────────────────────────────────────────────────────────────
// VIDEO SOURCES — admin-configured per-movie stream URLs.
// ────────────────────────────────────────────────────────────────────────
export async function getVideoSources(slug) {
  return qAll(
    `SELECT player, source_type AS sourceType, url, label, quality, enabled
     FROM video_sources WHERE slug = ? ORDER BY player`, [slug])
}
export async function upsertVideoSource({ slug, player, sourceType, url, label, quality, enabled }) {
  await qRun(
    `INSERT INTO video_sources (id, slug, player, source_type, url, label, quality, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(slug, player) DO UPDATE SET
       source_type=excluded.source_type, url=excluded.url, label=excluded.label,
       quality=excluded.quality, enabled=excluded.enabled, updated_at=datetime('now')`,
    [crypto.randomUUID(), slug, player, sourceType, url, label||null, quality||null, enabled?1:0])
  return getVideoSources(slug)
}
export async function deleteVideoSource(slug, player) {
  await qRun(`DELETE FROM video_sources WHERE slug = ? AND player = ?`, [slug, player])
  return getVideoSources(slug)
}

// ────────────────────────────────────────────────────────────────────────
// SUBTITLE TRACKS — admin-configured subtitle files per movie.
// ────────────────────────────────────────────────────────────────────────
export async function getSubtitleTracks(slug) {
  return qAll(
    `SELECT url, label, lang, is_default AS isDefault
     FROM subtitle_tracks WHERE slug = ? ORDER BY is_default DESC, lang`, [slug])
}
export async function upsertSubtitleTrack({ slug, url, label, lang, isDefault }) {
  await qRun(
    `INSERT INTO subtitle_tracks (id, slug, url, label, lang, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(slug, lang, url) DO UPDATE SET label=excluded.label, is_default=excluded.is_default`,
    [crypto.randomUUID(), slug, url, label||null, lang||'mn', isDefault?1:0])
  return getSubtitleTracks(slug)
}
export async function deleteSubtitleTrack(slug, lang, url) {
  await qRun(`DELETE FROM subtitle_tracks WHERE slug = ? AND lang = ? AND url = ?`, [slug, lang, url])
  return getSubtitleTracks(slug)
}

// ────────────────────────────────────────────────────────────────────────
// WEBHOOK / PAYMENT EVENT LOGS
// ────────────────────────────────────────────────────────────────────────
export async function logPaymentEvent({ txnId, fromStatus, toStatus, provider, detail }) {
  await qRun(`INSERT INTO security_logs (id, user_id, type, detail, ip, created_at) VALUES (NULL, NULL, 'payment-event', ?, NULL, datetime('now'))`,
    [JSON.stringify({ txnId, fromStatus, toStatus, provider, detail })])
}
export async function logWebhookEvent({ id, provider, type, payload }) {
  await qRun(`INSERT OR IGNORE INTO webhook_events (id, provider, type, payload, processed) VALUES (?, ?, ?, ?, 1)`,
    [id, provider, type||null, payload ? JSON.stringify(payload) : null])
}
export async function isWebhookEventProcessed(id) {
  const row = await qOne(`SELECT processed FROM webhook_events WHERE id = ?`, [id])
  return row?.processed === 1
}

// ────────────────────────────────────────────────────────────────────────
// FAVORITES — server-side watchlist sync.
// ────────────────────────────────────────────────────────────────────────
export async function listFavorites(userId) {
  return qAll(`SELECT f.movie_id AS movieId, f.created_at AS createdAt FROM favorites f WHERE f.user_id = ? ORDER BY f.created_at DESC`, [userId])
}
export async function toggleFavorite(userId, movieSlug) {
  const movie = await qOne(`SELECT id FROM movies WHERE slug = ?`, [movieSlug])
  if (!movie) return { error: { code: 'MOVIE_NOT_FOUND', status: 404 } }
  const existing = await qOne(`SELECT id FROM favorites WHERE user_id = ? AND movie_id = ?`, [userId, movie.id])
  if (existing) { await qRun(`DELETE FROM favorites WHERE id = ?`, [existing.id]); return { favorited: false } }
  await qRun(`INSERT INTO favorites (id, user_id, movie_id, created_at) VALUES (?, ?, ?, datetime('now'))`, [crypto.randomUUID(), userId, movie.id])
  return { favorited: true }
}

// ────────────────────────────────────────────────────────────────────────
// PROFILE — display name, bio, avatar.
// ────────────────────────────────────────────────────────────────────────
export async function getProfile(userId) {
  return qOne(`SELECT avatar_url AS avatarUrl, display_name AS displayName, bio FROM profiles WHERE user_id = ?`, [userId])
}
export async function updateProfile(userId, { displayName, bio, avatarUrl }) {
  const existing = await qOne(`SELECT id FROM profiles WHERE user_id = ?`, [userId])
  if (existing) {
    const sets = [], args = []
    if (displayName !== undefined) { sets.push('display_name = ?'); args.push(displayName) }
    if (bio !== undefined) { sets.push('bio = ?'); args.push(bio) }
    if (avatarUrl !== undefined) { sets.push('avatar_url = ?'); args.push(avatarUrl) }
    if (sets.length === 0) return { ok: true }
    args.push(userId)
    await qRun(`UPDATE profiles SET ${sets.join(', ')} WHERE user_id = ?`, args)
  } else {
    await qRun(`INSERT INTO profiles (id, user_id, avatar_url, display_name, bio, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [crypto.randomUUID(), userId, avatarUrl||null, displayName||null, bio||null])
  }
  return { ok: true }
}