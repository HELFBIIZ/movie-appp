// scripts/backfill-media.mjs — fill missing poster/banner/trailer/meta for the
// runtime catalog from TMDB, without ever overwriting existing values.
//
// Why: discover/list payloads often omit artwork that a standalone /tv/{id} or
// /movie/{id} returns, and trailers are NEVER in list responses — they come
// from /{id}/videos. This walks every entry that has a tmdbId, fetches only
// what's missing, and patches the JSON files in place (idempotent).
//
// Trailer choice: site=YouTube; type Trailer > Teaser > Official; language
// mn (Mongolian) > en > any. If nothing qualifies the field stays null.
//
// Usage:
//   node scripts/backfill-media.mjs                  (all kinds, only-missing)
//   node scripts/backfill-media.mjs --kinds=western  (one file)
//   node scripts/backfill-media.mjs --limit=20 --delay=400
//   node scripts/backfill-media.mjs --no-write       (dry run)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

function loadEnv(key) {
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
  const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return m ? m[1].trim() : ''
}

const API_KEY = loadEnv('TMDB_API_KEY') || loadEnv('NEXT_PUBLIC_TMDB_API_KEY')
if (!API_KEY) {
  console.error('TMDB_API_KEY not found in .env.local')
  process.exit(1)
}

const IMG = 'https://image.tmdb.org/t/p/'
const flag = (name, def = null) => {
  const eq = process.argv.find((x) => x.startsWith(`--${name}=`))
  if (eq) return eq.split('=')[1]
  return def
}
const KINDS = (flag('kinds', 'movie,kdrama,western')).split(',')
const LIMIT = flag('limit') ? parseInt(flag('limit'), 10) : Infinity
const DELAY = parseInt(flag('delay', '1200'), 10)
const NO_WRITE = process.argv.includes('--no-write')

const FILES = {
  movie: { file: 'movies.generated.json', arr: (d) => d.movies, type: 'movie', wrap: (d, arr) => ({ ...d, movies: arr, generated: new Date().toISOString().split('T')[0] }) },
  kdrama: { file: 'kdramas.json', arr: (d) => d, type: 'tv', wrap: (d, arr) => arr },
  western: { file: 'western.json', arr: (d) => d, type: 'tv', wrap: (d, arr) => arr },
}

async function tmdb(pathname, tries = 0) {
  const res = await fetch(`https://api.themoviedb.org/3${pathname}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (res.status === 429 || res.status >= 500) {
    if (tries >= 4) return null
    await delay(1800)
    return tmdb(pathname, tries + 1)
  }
  if (!res.ok) return null
  return res.json()
}

function pickTrailer(videos) {
  if (!videos || !videos.results || !videos.results.length) return null
  const vids = videos.results.filter((v) => v.site === 'YouTube' && v.type && v.key)
  if (!vids.length) return null
  const weight = (v) => {
    const typeScore = v.type === 'Trailer' ? 3 : v.type === 'Teaser' ? 2 : v.official ? 1 : 0
    const langScore = v.iso_639_1 === 'mn' ? 4 : v.iso_639_1 === 'en' ? 2 : 1
    return typeScore * 10 + langScore
  }
  return vids.sort((a, b) => weight(b) - weight(a))[0].key
}

const fmtRuntime = (minutes) => {
  if (!minutes) return 'N/A'
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

const T0 = Date.now()
let fetches = 0
let patched = 0

for (const kind of KINDS) {
  const cfg = FILES[kind]
  if (!cfg) { console.error('unknown kind', kind); process.exit(1) }
  const fp = path.join(ROOT, 'src', 'lib', cfg.file)
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'))
  const arr = cfg.arr(data)
  const todo = arr
    .filter((m) => m && m.tmdbId)
    .filter((m) => !m.trailerYouTubeId || !m.poster || !m.banner || !m.plot || !(m.year > 0))
    .slice(0, LIMIT)
  console.log(`\n[${kind}] ${todo.length} to backfill of ${arr.length} (file ${cfg.file})`)

  let done = 0
  for (const e of todo) {
    const needDetail = !e.poster || !e.banner || !e.plot || !(e.year > 0) || !e.runtime || !e.rating
    const needTrailer = !e.trailerYouTubeId
    let detail = null
    let videos = null
    if (needDetail) {
      detail = await tmdb(`/${cfg.type}/${e.tmdbId}`)
      fetches++
    }
    if (needTrailer) {
      videos = await tmdb(`/${cfg.type}/${e.tmdbId}/videos`)
      fetches++
    }
    if (!detail && !videos) { done++; continue }

    let changed = false
    if (detail) {
      if (!e.poster && detail.poster_path) { e.poster = `${IMG}w500${detail.poster_path}`; changed = true }
      if (!e.banner && detail.backdrop_path) { e.banner = `${IMG}w1280${detail.backdrop_path}`; changed = true }
      if (!e.plot && detail.overview) { e.plot = detail.overview; changed = true }
      if (!(e.year > 0) && (detail.release_date || detail.first_air_date)) {
        e.year = parseInt((detail.release_date || detail.first_air_date).slice(0, 4), 10); changed = true
      }
      if ((!e.runtime || e.runtime === 'N/A') && (detail.runtime || (detail.episode_run_time || [])[0])) {
        e.runtime = fmtRuntime(detail.runtime || (detail.episode_run_time || [])[0]); changed = true
      }
      if (!e.rating && detail.vote_average) { e.rating = Math.round(detail.vote_average * 10) / 10; changed = true }
    }
    if (videos) {
      const key = pickTrailer(videos)
      if (key) { e.trailerYouTubeId = key; changed = true }
    }
    if (changed) patched++
    done++
    if (done % 25 === 0) console.log(`  ${kind} ${done}/${todo.length} (+${fetches} fetches, patched ${patched}) ${((Date.now() - T0) / 60000).toFixed(1)}m`)
    await delay(DELAY)
  }

  if (!NO_WRITE) {
    fs.writeFileSync(fp, JSON.stringify(cfg.wrap(data, arr), null, 2))
  }
}

console.log(`\ndone: ${fetches} TMDB fetches, ${patched} entries patched in ${((Date.now() - T0) / 60000).toFixed(1)}m${NO_WRITE ? ' (dry-run, nothing written)' : ''}`)