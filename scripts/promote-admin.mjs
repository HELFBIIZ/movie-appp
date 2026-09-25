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

const REMOTE_URL = process.env.TURSO_DATABASE_URL
const REMOTE_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!REMOTE_URL || !REMOTE_TOKEN) {
  console.error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env.local')
  process.exit(1)
}

const client = createClient({ url: REMOTE_URL, authToken: REMOTE_TOKEN })

;(async () => {
  const email = 'ADMIN@VXNTA.MN'
  const role = process.argv[2] || 'ADMIN'
  const valid = ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN']
  if (!valid.includes(role)) {
    console.error(`Invalid role: ${role}. Must be one of ${valid.join('|')}`)
    process.exit(1)
  }

  const before = await client.execute(
    `SELECT u.id, u.email, u.username, r.code AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = ?`,
    [email]
  )
  console.log('Before:', JSON.stringify(before.rows[0] || 'NOT FOUND'))

  const res = await client.execute(
    `UPDATE users SET role_id = (SELECT id FROM roles WHERE code = ?) WHERE email = ? AND deleted_at IS NULL`,
    [role, email]
  )
  console.log('Updated rows:', res.rowsAffected)

  const after = await client.execute(
    `SELECT u.id, u.email, u.username, r.code AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = ?`,
    [email]
  )
  console.log('After:', JSON.stringify(after.rows[0] || 'STILL NOT FOUND'))

  const all = await client.execute(
    `SELECT u.email, u.username, r.code AS role FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.created_at DESC LIMIT 10`
  )
  console.log('All users:', JSON.stringify(all.rows, null, 2))
})().catch((e) => { console.error(e); process.exit(1) })
