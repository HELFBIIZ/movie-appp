// scripts/backup.mjs — safe online SQLite backup + retention.
//
// Uses better-sqlite3's online Backup API (no stopping the app, consistent
// snapshot) on the LIVE app.db, writes to backups/YYYYMMDD-HHMMSS.db, and
// prunes to the most recent K copies. WAL + foreign_keys stay untouched.
//
// Usage:    node scripts/backup.mjs [--keep N]
// Cron:     0 3 * * *  cd /path/to/movie-app && node scripts/backup.mjs --keep 14
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DB_FILE = path.join(ROOT, 'data', 'db', 'app.db')
const BACKUP_DIR = path.join(ROOT, 'backups')

const keepArg = process.argv.find((a) => a.startsWith('--keep='))
const KEEP = keepArg ? parseInt(keepArg.split('=')[1], 10) : 7

if (!fs.existsSync(DB_FILE)) {
  console.error(`No database at ${DB_FILE}`)
  process.exit(1)
}

fs.mkdirSync(BACKUP_DIR, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const target = path.join(BACKUP_DIR, `${stamp}.db`)

const source = new Database(DB_FILE, { readonly: true })
await source.backup(target)
source.close()
console.log(`✓ backup -> ${target}`)

const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db')).sort().reverse()
for (const f of files.slice(KEEP)) {
  fs.unlinkSync(path.join(BACKUP_DIR, f))
  console.log(`pruned ${f}`)
}
console.log(`retained ${Math.min(files.length, KEEP)} backup(s) in ${BACKUP_DIR}`)