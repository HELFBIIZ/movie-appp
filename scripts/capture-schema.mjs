// Walk the LIVE app.db, snapshot its real DDL into data/db/schema.sql
// (the SCHEMA_FILE path src/lib/db.mjs opens at boot). Source of truth:
// SQLite's own sqlite_master — not a hand-maintained copy.
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const appDb = path.join(here, '..', 'data', 'db', 'app.db')
const out = path.join(here, '..', 'data', 'db', 'schema.sql')

const db = new Database(appDb, { readonly: true })
const rows = db.prepare(
  `SELECT type, name, sql FROM sqlite_master
   WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
   ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 ELSE 3 END, name`
).all()

if (rows.length === 0) {
  console.error('NO schema objects found in', appDb)
  process.exit(1)
}

const ddl = rows.map(r => r.sql + ';').join('\n')
fs.writeFileSync(out, ddl)
console.log(`snapshotted ${rows.length} schema objects → ${path.relative(here + '/..', out)}`)
console.log('tables:', rows.filter(r => r.type === 'table').map(r => r.name).join(', '))
