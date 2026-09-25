import { createClient } from '@libsql/client'
import fs from 'fs'

function loadEnv(path) {
  if (!fs.existsSync(path)) return
  for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
loadEnv('.env.local')

const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })

const receipts = await client.execute(`
  SELECT r.txn_id, r.status, r.phone, r.note, u.username, u.email,
         p.amount_mnt, p.status AS payment_status, p.plan_id, p.user_id, r.created_at
  FROM payment_receipts r
  JOIN payments p ON p.txn_id = r.txn_id
  JOIN users u ON u.id = r.user_id
  ORDER BY r.created_at DESC LIMIT 20
`)
console.log('Receipts:', JSON.stringify(receipts.rows, null, 2))

const subs = await client.execute(`SELECT id, user_id, plan_id, status, expires_at, start_date FROM subscriptions ORDER BY created_at DESC LIMIT 10`)
console.log('Subscriptions:', JSON.stringify(subs.rows, null, 2))

const plans = await client.execute('SELECT id, code, name, price_mnt, duration_days FROM subscription_plans')
console.log('Plans:', JSON.stringify(plans.rows, null, 2))

const pendingSubs = await client.execute(`
  SELECT s.id, s.user_id, s.status, s.expires_at, u.username, u.email, p.code AS plan_code, p.duration_days
  FROM subscriptions s
  JOIN users u ON u.id = s.user_id
  JOIN subscription_plans p ON p.id = s.plan_id
  ORDER BY s.created_at DESC LIMIT 15
`)
console.log('Subs w/ users:', JSON.stringify(pendingSubs.rows, null, 2))
