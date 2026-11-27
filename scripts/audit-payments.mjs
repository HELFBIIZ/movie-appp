import { createClient } from '@libsql/client'
import fs from 'fs'

for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
}

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })

const rows = await db.execute(`
  SELECT u.id, u.email, u.username, s.id AS subscription_id, s.plan_id, s.expires_at,
         p.code AS plan_code, p.price_mnt, p.duration_days,
         COALESCE(GROUP_CONCAT(DISTINCT pay.provider), '') AS providers,
         COALESCE(GROUP_CONCAT(DISTINCT pay.status), '') AS payment_statuses,
         COALESCE(SUM(CASE WHEN pay.status = 'SUCCESSFUL' AND pay.provider != 'local_dev' THEN 1 ELSE 0 END), 0) AS verified_payments,
         COALESCE(SUM(CASE WHEN pay.status = 'SUCCESSFUL' AND pay.provider = 'local_dev' THEN 1 ELSE 0 END), 0) AS demo_payments
  FROM subscriptions s
  JOIN users u ON u.id = s.user_id
  JOIN subscription_plans p ON p.id = s.plan_id
  LEFT JOIN payments pay ON pay.user_id = u.id
  WHERE s.status = 'ACTIVE' AND datetime(s.expires_at) > datetime('now')
  GROUP BY s.id
  ORDER BY u.created_at DESC, s.created_at DESC
`)
console.log(JSON.stringify(rows.rows, null, 2))

const payments = await db.execute(`
  SELECT txn_id, user_id, plan_id, amount_mnt, status, provider, provider_ref, created_at, verified_at
  FROM payments ORDER BY created_at DESC LIMIT 30
`)
console.log('PAYMENTS')
console.log(JSON.stringify(payments.rows, null, 2))

const pending = await db.execute(`SELECT COUNT(*) AS count FROM payment_receipts WHERE status = 'PENDING'`)
console.log('PENDING_RECEIPTS', JSON.stringify(pending.rows[0]))
