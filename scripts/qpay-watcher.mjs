// scripts/qpay-watcher.mjs — automatic payment detection daemon (QPay).
//
// Reads the app's SQLite file directly (read-only) to find still-PENDING QPay
// invoices, polls QPay /v2/payment/check for each, and when QPay says the money
// is in: POSTs the signed webhook to the running app so the payment is flipped
// SUCCESSFUL server-side (activatePaymentSuccess is replay-safe) and the buyer
// gets their "✅ Төлбөр баталгаажлаа" bell notification — no admin needed.
//
// This is what powers "the site automatically detects when a payment actually
// comes in" while you're not looking at the page.
//
// Env (.env.local):
//   QPAY_INVOICE_AUTH      base64("username:password") — merchant creds
//   QPAY_CALLBACK_TOKEN    shared secret the webhook verifies
//   NEXT_PUBLIC_APP_URL    public base URL (defaults to localhost if unset)
//
// Usage:
//   npm run qpay:watch          (loop forever, every 15s)
//   npm run qpay:watch -- --once
//   node scripts/qpay-watcher.mjs --once --poll=30 --max-age-hours=48
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { checkQpayInvoices, isQpayPaid } from '../src/lib/qpay.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

function loadEnv(key) {
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'))
    return m ? m[1].trim() : ''
  } catch {
    return ''
  }
}

const AUTH = loadEnv('QPAY_INVOICE_AUTH')
const TOKEN = loadEnv('QPAY_CALLBACK_TOKEN')
const APP_URL = (loadEnv('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000').replace(/\/$/, '')

if (!AUTH || !TOKEN) {
  console.log(`
qpay-watcher: QPay gateway not configured yet (QPAY_INVOICE_AUTH / QPAY_CALLBACK_TOKEN).
Nothing to poll — Khan Bank receipts are still verified manually by an admin.
When you have QPay merchant credentials (sandbox is free at qpay.mn), add them to
.env.local and run this again — paid invoices are then auto-detected and completed.
`)
  process.exit(1)
}

const flag = (name, def = null) => {
  const eq = process.argv.find((x) => x.startsWith(`--${name}=`))
  return eq ? eq.split('=')[1] : def
}
const ONCE = process.argv.includes('--once')
const POLL_S = Math.max(5, parseInt(flag('poll', '15'), 10))
const MAX_AGE_H = parseInt(flag('max-age-hours', '48'), 10)

// Direct read-only access to the app DB (the watcher never writes — the app
// does, via the signed webhook). db.mjs can't be imported here ('server-only').
const { default: Database } = await import('better-sqlite3')
let db = null
function openDb() {
  db = new Database(path.join(ROOT, 'data', 'db', 'app.db'), { readonly: true })
  db.pragma('journal_mode = WAL')
}
const pendingPayments = () => {
  if (!db) openDb()
  return db
    .prepare(
      `SELECT txn_id AS txnId, provider_ref AS providerRef, created_at AS createdAt
         FROM payments
        WHERE provider = 'qpay' AND status = 'PENDING' AND provider_ref IS NOT NULL
          AND datetime(created_at) > datetime('now', ?)`
    )
    .all(`-${MAX_AGE_H} hours`)
}

async function sweep() {
  const pending = pendingPayments()
  if (!pending.length) return { checked: 0, completed: 0 }
  const ids = pending.map((p) => p.providerRef).filter(Boolean)
  const res = await checkQpayInvoices([...new Set(ids)])
  if (!res) return { checked: pending.length, completed: 0, note: 'not configured' }
  if (res.error) return { checked: pending.length, completed: 0, error: res.error }

  let completed = 0
  let posted = 0
  for (const row of res.rows || []) {
    if (!isQpayPaid(row)) continue
    const match = pending.find((p) => p.providerRef === row.invoice_id)
    if (!match) continue
    const webhook = await fetch(`${APP_URL}/api/webhooks/qpay?token=${encodeURIComponent(TOKEN)}`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_id: row.invoice_id, payment_status: row.payment_status }),
    })
    posted++
    if (webhook.ok) {
      completed++
      console.log(`[${new Date().toISOString()}] 💰 ${match.txnId} (${row.payment_status}) → webhook ok → VIP activated + notified`)
    } else {
      console.warn(`[${new Date().toISOString()}] ⚠️ ${match.txnId} webhook failed HTTP ${webhook.status}`)
    }
  }
  return { checked: pending.length, completed, posted }
}

let runs = 0
do {
  try {
    const r = await sweep()
    console.log(
      `[${new Date().toISOString()}] sweep #${++runs}: checked ${r.checked}, completed ${r.completed || 0}${r.note ? ' (' + r.note + ')' : ''}${r.error ? ' error=' + JSON.stringify(r.error) : ''}`
    )
  } catch (err) {
    console.warn(`[${new Date().toISOString()}] sweep failed: ${err?.message || err}`)
  }
  if (ONCE) break
  await delay(POLL_S * 1000)
} while (true)