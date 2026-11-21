// scripts/scheduler.mjs — hands-free monthly catalog growth daemon.
//
// Every 30 days (or on --now) it runs the import pipeline automatically:
//   1) node scripts/import-tmdb.mjs movie   --limit 500 --page 1
//   2) node scripts/import-tmdb.mjs kdrama  --limit 500 --page 1
//   3) node scripts/import-tmdb.mjs western --limit 500 --page 1   (new Western credits)
//   4) node scripts/backfill-media.mjs                                (posters/trailers)
// Dedupe lives in the importer (tmdbId+slug), so re-runs never double-add.
//
// Usage:
//   npm run cron            # start the long-running daemon (schedules next in 30d)
//   npm run cron -- --now   # run a cycle immediately, then keep scheduling
//   node scripts/scheduler.mjs --once --now   # run one cycle and exit
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const MARK_FILE = path.join(ROOT, 'data', 'import-progress.json')
const INTERVAL_MS = 30 * 24 * 60 * 60 * 1000

const ONCE = process.argv.includes('--once')
const NOW = process.argv.includes('--now')

function lastRun() {
  try {
    const p = JSON.parse(fs.readFileSync(MARK_FILE, 'utf8'))
    return p.scheduler?.lastRun ? new Date(p.scheduler.lastRun).getTime() : 0
  } catch {
    return 0
  }
}
function stamp() {
  try {
    const p = JSON.parse(fs.readFileSync(MARK_FILE, 'utf8'))
    p.scheduler = { lastRun: new Date().toISOString() }
    fs.writeFileSync(MARK_FILE, JSON.stringify(p, null, 2))
  } catch { /* first run */ }
}

function step(label, args) {
  console.log(`\n▶ ${label}`)
  const r = spawnSync('node', args, { cwd: ROOT, stdio: 'inherit' })
  if (r.status !== 0) console.error(`  ✗ ${label} exited ${r.status} — continuing anyway`)
  return r.status === 0
}

function runCycle() {
  console.log('— monthly catalog cycle —')
  step('import movies (500)', ['scripts/import-tmdb.mjs', 'movie', '--limit', '500', '--page', '1'])
  step('import k-dramas (500)', ['scripts/import-tmdb.mjs', 'kdrama', '--limit', '500', '--page', '1'])
  step('import western (500)', ['scripts/import-tmdb.mjs', 'western', '--limit', '500', '--page', '1'])
  step('backfill poster/banner/trailer', ['scripts/backfill-media.mjs', '--delay', '800'])
  stamp()
  console.log('cycle complete — next run scheduled in 30 days')
}

if (ONCE) {
  if (NOW || Date.now() - lastRun() >= INTERVAL_MS) runCycle()
  else console.log('cycle not due yet (last run < 30 days ago). Use --now to force.')
  process.exit(0)
}

// Daemon mode.
if (NOW || Date.now() - lastRun() >= INTERVAL_MS) runCycle()
console.log(`scheduler daemon running — next cycle at ${new Date(Date.now() + INTERVAL_MS).toISOString()}`)
setInterval(runCycle, INTERVAL_MS)
// keep alive
process.on('SIGINT', () => { console.log('scheduler stopped'); process.exit(0) })