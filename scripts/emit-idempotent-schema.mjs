import Database from 'better-sqlite3'
import fs from 'fs'
const db = new Database('data/db/app.db', { readonly: true })
const objs = db.prepare(`SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid`).all()
let out = `-- movie-app live schema — MIRRORED VERBATIM from the running app.db
-- (sqlite_master = single source of truth; Prisma contract lives in
--  prisma/schema.prisma as the provider-agnostic twin).\n-- Auto-emitted, idempotent. Someone hand-SQL-ing over this in prod will be reverted.\n\n`
for (const o of objs) {
  let sql = o.sql.trim()
  if (/^CREATE (TABLE|INDEX)/i.test(sql)) sql = sql.replace(/^CREATE (TABLE|INDEX)/i, 'CREATE $1 IF NOT EXISTS')
  if (!sql.endsWith(';')) sql += ';'
  out += sql + '\n'
}
fs.writeFileSync('data/db/schema.sql', out)
console.log('EMITTED', objs.length, 'objects → data/db/schema.sql (all CREATEs idempotent)')
console.log('objects:', objs.map(o => (o.type==='index'?'i:':'t:') + o.name).join(' '))
