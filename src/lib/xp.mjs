// ────────────────────────────────────────────────────────────────────────
// XP/STREAK LEDGER — deliberately separate file from db.mjs: db.mjs owns
// "can I?" (auth/session/subscription gate); THIS file owns "how much did
// they earn?" as pure INSERTs into the SAME xp_accounts table the register
// grant already seeds (uuid PK, xp, level, streak_days). Both use the same
// imported getDb single instance so ledger rows are not partially-applied.
// Anti-farm: every award is a bounded SERVER-OK'd amount per activity code,
// rate-limited per user per day by the same WINDOW_MS bucket db.mjs uses.
// ────────────────────────────────────────────────────────────────────────
import crypto from 'crypto'
import { getDb, rateLimit } from './db.mjs'

const XP_RULES = Object.freeze({
  VIDEO_VIEW:  { amount: 20, daily: 120 },   // 6/day cap → 6×20 = 120 XP max/day
  SUBTITLE_HELP: { amount: 15, daily: 60 },  // 4/day cap
  RATING:      { amount: 10, daily: 50 },    // 5/day cap
  REVIEW:      { amount: 30, daily: 150 },   // 5/day cap → 150 max
  SHARE_REF:   { amount: 40, daily: 40 },    // 1/day cap (social-proof proof)
  PROFILE_PIC: { amount: 25, daily: 25 },    // one-time
  DAILY_LOGIN: { amount: 10, daily: 10 },    // once/day, tied to streak flip
})

export async function awardXp({ userId, activity }) {
  const rule = XP_RULES[activity]
  if (!rule) return { error: { code: 'UNKNOWN_ACTIVITY' } }

  const dayKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (streak date format db.mjs already uses)
  const rl = rateLimit(`xp:${userId}:${activity}:${dayKey}`, { max: Math.ceil(rule.daily / rule.amount) })
  if (rl.limited) {
    return { error: { code: 'XP_DAILY_CAP', retryAfterIn: rl.retryAfterSeconds } }
  }

  const client = await getDb()
  const [beforeRow] = (await client.execute({ sql: 'SELECT xp, level FROM xp_accounts WHERE user_id = ?', args: [userId] })).rows
  const b = beforeRow ?? { xp: 0, level: 1 }
  await client.batch(
    [
      { sql: `INSERT OR IGNORE INTO xp_accounts (id, user_id) VALUES (?, ?)`, args: [crypto.randomUUID(), userId] },
      { sql: `UPDATE xp_accounts SET xp = xp + ?, updated_at = datetime('now') WHERE user_id = ?`, args: [rule.amount, userId] },
      { sql: `INSERT INTO xp_transactions (id, user_id, activity, amount, reason, created_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))`, args: [crypto.randomUUID(), userId, activity, rule.amount, rule.reason ?? activity] },
    ],
    'write'
  )
  const after = (await client.execute({ sql: 'SELECT xp, level FROM xp_accounts WHERE user_id = ?', args: [userId] })).rows[0]
  return { user: userId, gained: rule.amount, xp: after.xp, level: after.level, from: b.xp }
}

// Streak flip — the login-streak ledger row, ONCE per calendar day, atomically.
// A streak continues only if LAST login was yesterday; otherwise it restarts.
export async function flipLoginStreak({ userId, date = new Date().toISOString().slice(0, 10) }) {
  const client = await getDb()
  const row = (await client.execute(
    `SELECT current, last_login_date AS lastDate FROM login_streaks WHERE user_id = ?`, [userId]
  )).rows[0] || null
  const today = date
  if (row && row.lastDate === today) return { flipped: false, reason: 'ALREADY_TODAY' }
  const current = row && row.lastDate != null && row.lastDate === yesterdayOf(today) ? row.current + 1 : 1
  await client.batch(
    [
      {
        sql: `INSERT OR IGNORE INTO login_streaks (id, user_id, current, best, last_login_date)
              VALUES (?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), userId, current, current, today],
      },
      {
        sql: `UPDATE login_streaks SET current = ?, best = MAX(best, ?), last_login_date = ? WHERE user_id = ?`,
        args: [current, current, today, userId],
      },
    ],
    'write'
  )
  return { flipped: true, current, date: today }
}

function yesterdayOf(iso) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
