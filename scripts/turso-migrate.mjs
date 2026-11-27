// scripts/turso-migrate.mjs — push the LOCAL SQLite data into a Turso remote.
//
// What it does (idempotent; safe to re-run):
//   1. Reads .env.local for TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
//   2. Boots schema.sql + seeds.sql on the remote IF empty (same self-heal the
//      app does at first connect).
//   3. Copies every row from the local file:data/db/app.db into the remote using
//      INSERT OR IGNORE (existing rows by PK are skipped) — so re-runs never
//      duplicate data.
//
// Usage:  node scripts/turso-migrate.mjs
// After this, point the app at the remote by keeping TURSO_DATABASE_URL set.
import fs from 'fs'
import path from 'path'
import { createClient } from '@libsql/client'

const ROOT = path.resolve(process.argv[2] ? process.argv[2] : '.')
const ENV_FILE = path.join(ROOT, '.env.local')
const SCHEMA_FILE = path.join(ROOT, 'data', 'db', 'schema.sql')
const SEED_FILE = path.join(ROOT, 'data', 'db', 'seeds.sql')
const LOCAL_DB = path.join(ROOT, 'data', 'db', 'app.db')

function loadEnv(file) {
  const out = {}
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !m[2].startsWith('#')) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

const env = loadEnv(ENV_FILE)
const URL = env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL
const TOKEN = env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN

if (!URL) {
  console.error('TURSO_DATABASE_URL not found in .env.local — run `turso db create` + `turso db tokens create` first.')
  process.exit(1)
}
if (!TOKEN) {
  console.error('TURSO_AUTH_TOKEN not found in .env.local — run `turso db tokens create <db>` and paste it.')
  process.exit(1)
}
if (!fs.existsSync(LOCAL_DB)) {
  console.error(`Local DB not found: ${LOCAL_DB} — nothing to migrate.`)
  process.exit(1)
}

console.log(`local : ${LOCAL_DB}`)
console.log(`remote: ${URL}`)

const local = createClient({ url: `file:${LOCAL_DB}` })
const remote = createClient({ url: URL, authToken: TOKEN })

// 1) Boot schema + seeds on the remote if it's empty.
const probe = await remote.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1`)
if (!probe.rows.length) {
  console.log('remote empty → applying schema.sql + seeds.sql…')
  if (!fs.existsSync(SCHEMA_FILE)) { console.error(`Missing ${SCHEMA_FILE}`); process.exit(1) }
  await remote.executeMultiple(fs.readFileSync(SCHEMA_FILE, 'utf8'))
  if (fs.existsSync(SEED_FILE)) await remote.executeMultiple(fs.readFileSync(SEED_FILE, 'utf8'))
} else {
  console.log('remote already has tables → skipping schema/seed bootstrap.')
}

// 2) Copy rows table-by-table (idempotent INSERT OR IGNORE), in schema.sql
// declaration order so FK parents are written before their children.
const allTables = (await local.execute(
  `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
)).rows.map((r) => r.name)
const schemaOrder = [...fs.readFileSync(SCHEMA_FILE, 'utf8').matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["'`]?(\w+)["'`]?/g)].map((m) => m[1])
const tables = schemaOrder.filter((t) => allTables.includes(t)).concat(
  allTables.filter((t) => !schemaOrder.includes(t))
)

let total = 0
for (const table of tables) {
  const cols = (await local.execute(`PRAGMA table_info(${table})`)).rows.map((c) => c.name)
  const sql = `SELECT ${cols.map((c) => `\`${c}\``).join(', ')} FROM \`${table}\``
  const rows = (await local.execute(sql)).rows
  if (!rows.length) { console.log(`  ${table}: 0 rows`); continue }
  const insert = `INSERT OR IGNORE INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(', ')})
                  VALUES (${cols.map(() => '?').join(', ')})`
  await remote.batch(rows.map((row) => ({ sql: insert, args: cols.map((c) => (row[c] === undefined ? null : row[c])) })), 'write')
  total += rows.length
  console.log(`  ${table}: ${rows.length} rows`)
}

console.log(`\nmigrated ${total} total rows → ${URL}`)

const users = (await remote.execute('SELECT COUNT(*) c FROM users')).rows[0].c
const payments = (await remote.execute('SELECT COUNT(*) c FROM payments')).rows[0].c
console.log(`remote now: ${users} users, ${payments} payments`)