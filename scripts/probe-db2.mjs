import fs from 'fs'
import Database from 'better-sqlite3'
import crypto from 'crypto'

const dbSrc = fs.readFileSync('src/lib/db.mjs', 'utf8')
const ddl = fs.readFileSync('data/db/schema.sql', 'utf8')

const db = new Database(':memory:')
db.pragma('foreign_keys = ON')
db.exec(ddl)
console.log('DDL applied. tables:', db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all().map(r => r.name).join(', '))

const stmts = [...dbSrc.matchAll(/db\.prepare\(\s*`([^`]+)`\s*\)/g)].map(m => m[1])
console.log('db.mjs has', stmts.length, 'prepared statements — PREPARING EACH against live schema:')
let fail = 0
for (const raw of stmts) {
  try {
    db.prepare(raw)
    console.log('  ✓', raw.replace(/\s+/g, ' ').slice(0, 64))
  } catch (e) {
    fail++
    console.log('  ✗', raw.replace(/\s+/g, ' ').slice(0, 64), '→', e.message.slice(0, 60))
  }
}
console.log('\nprepare failures:', fail)

const pw = 'correct horse battery staple'
const salt = crypto.randomBytes(16).toString('hex')
const N = 16384, r = 8, p = 1, keylen = 20
const hash = crypto.scryptSync(pw, salt, keylen, { N, r, p }).toString('hex')
const stored = `scrypt$${salt}$${hash}`
const [ , s2, h2 ] = stored.split('$')
const cand = crypto.scryptSync(pw, s2, keylen, { N, r, p }).toString('hex')
const ok = crypto.timingSafeEqual(Buffer.from(h2, 'hex'), Buffer.from(cand, 'hex'))
const bad = crypto.scryptSync('wrong', s2, keylen, { N, r, p }).toString('hex')
console.log('scrypt verify(same):', ok, '| verify(wrong):', !crypto.timingSafeEqual(Buffer.from(h2, 'hex'), Buffer.from(bad, 'hex')))
