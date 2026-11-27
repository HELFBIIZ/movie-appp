import { createClient } from '@libsql/client'
import fs from 'fs'

function loadEnv(path) {
  if (!fs.existsSync(path)) return
  for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

loadEnv('.env.local')
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
const execute = process.argv.includes('--execute')
const rows = await db.execute(`
  SELECT s.id, s.user_id, p.code AS plan_code, p.name AS plan_name, s.expires_at,
         u.email, u.username
  FROM subscriptions s
  JOIN subscription_plans p ON p.id = s.plan_id
  JOIN users u ON u.id = s.user_id
  WHERE s.status = 'ACTIVE' AND datetime(s.expires_at) > datetime('now')
    AND p.price_mnt > 0
    AND NOT EXISTS (
      SELECT 1 FROM payments pay
      WHERE pay.user_id = s.user_id AND pay.plan_id = s.plan_id
        AND pay.status = 'SUCCESSFUL' AND pay.provider IN ('bank', 'qpay')
    )
  ORDER BY s.created_at DESC
`)
console.log(JSON.stringify({ dryRun: !execute, candidates: rows.rows }, null, 2))

if (execute && rows.rows.length > 0) {
  const writes = []
  for (const row of rows.rows) {
    writes.push({
      sql: `UPDATE subscriptions SET status = 'REVOKED', updated_at = datetime('now') WHERE id = ?`,
      args: [row.id],
    })
    writes.push({
      sql: `INSERT INTO security_logs (id, user_id, type, detail, ip, created_at)
            VALUES (?, ?, 'subscription-revoke', ?, NULL, datetime('now'))`,
      args: [crypto.randomUUID(), row.user_id, `${row.plan_code} revoked by audit script`],
    })
    writes.push({
      sql: `INSERT INTO notifications (id, user_id, type, title, body, link, created_at)
            VALUES (?, ?, 'info', 'VIP эрх цуцлагдлаа',
                    'Баталгаажаагүй төлбөрөөр идэвхжсэн VIP эрхийг цуцаллаа. Khan Bank шилжүүлгээ илгээж, админаар баталгаажуулна уу.',
                    '/pricing', datetime('now'))`,
      args: [crypto.randomUUID(), row.user_id],
    })
  }
  await db.batch(writes, 'write')
  console.log(`REVOKED ${rows.rows.length} UNVERIFIED SUBSCRIPTIONS`)
}

await db.close()
