// scripts/backfill-trailers.mjs — YouTube-search fallback for catalog entries
// that still have no trailerYouTubeId after a TMDB backfill.
//
// Why: TMDB only knows trailers a studio deliberately attached to a title.
// TV series in particular rarely have one. This mode searches YouTube directly
// (YouTube Data API v3, `search` endpoint) by the catalog title + "trailer",
// scores candidate videos (must contain the title and trailer keywords, rejects
// "full movie"/"фильм"/soundtrack), and patches trailerYouTubeId in the JSON.
//
// Note: works for entries WITHOUT tmdbId too (e.g. the 514 static K-Dramas),
// because it searches by title, not by TMDB id.
//
// Quota: each search costs 100 units; the free YouTube Data API tier is
// 10,000 units/day => ~100 searches/day. Run --limit=... in daily batches.
//
// Usage:
//   # .env.local needs  YOUTUBE_API_KEY=AIza…  (Google Cloud Console → APIs &
//   # Services → YouTube Data API v3 → Create credentials / API key)
//   node scripts/backfill-trailers.mjs                   (all kinds, only-missing)
//   node scripts/backfill-trailers.mjs --kinds=kdrama    (K-Dramas first — 514
//   node scripts/backfill-trailers.mjs --limit=95 --delay=700   static entries)
//   node scripts/backfill-trailers.mjs --no-write        (dry run)
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

const YT_KEY = loadEnv('YOUTUBE_API_KEY')
if (!YT_KEY) {
  console.error(`
YOUTUBE_API_KEY not found in .env.local

To enable the YouTube trailer-search mode, add a key in under two minutes:
  1. Open Google Cloud Console → https://console.cloud.google.com/apis/
  2. Create/select a project → "Enable APIs and services"
  3. Search "YouTube Data API v3" → Enable
  4. Credentials → "+ Create credentials" → "API key"
  5. Copy the AIza… key into .env.local as:
       YOUTUBE_API_KEY=AIza…
  6. Re-run this script.

Then run e.g.  node scripts/backfill-trailers.mjs --kinds=kdrama --limit=95
`)
  process.exit(1)
}

const flag = (name, def = null) => {
  const eq = process.argv.find((x) => x.startsWith(`--${name}=`))
  if (eq) return eq.split('=')[1]
  return def
}
const KINDS = (flag('kinds', 'movie,kdrama,western')).split(',')
const LIMIT = flag('limit') ? parseInt(flag('limit'), 10) : Infinity
const DELAY = parseInt(flag('delay', '800'), 10)
const NO_WRITE = process.argv.includes('--no-write')

const FILES = {
  movie: 'movies.generated.json',
  kdrama: 'kdramas.json',
  western: 'western.json',
}

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim()

const BAD_HINTS = ['full movie', 'фильм', 'pelicula completa', 'fhd', 'hd movie', 'soundtrack', 'ost', 'theme song', 'netflix japan', 'playthrough']
const GOOD_HINTS = ['trailer', 'teaser', 'official']

function scoreVideo(v, title, year) {
  if (!v.snippet || !v.snippet.title) return 0
  const t = norm(v.snippet.title)
  let s = 0
  for (const b of BAD_HINTS) if (t.includes(b)) s -= 6
  for (const g of GOOD_HINTS) if (t.includes(g)) s += g === 'trailer' ? 4 : g === 'teaser' ? 2 : 1
  const nm = norm(title)
  if (t.includes(nm)) s += 6
  else {
    const words = nm.split(' ').filter((w) => w.length > 2)
    if (words.length >= 2 && words.slice(0, 2).every((w) => t.includes(w))) s += 4
  }
  if (year && t.includes(String(year))) s += 1
  return s
}

async function searchYT(query, title, year, tries = 0) {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '5',
    q: query,
    key: YT_KEY,
  })
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { cache: 'no-store' })
  if (res.status === 429 || res.status === 403) {
    if (tries >= 1) return null
    await delay(5000)
    return searchYT(query, title, year, tries + 1)
  }
  if (!res.ok) return null
  const data = await res.json()
  if (!data.items) return null
  const ranked = data.items
    .map((v) => ({ id: v.id?.videoId, s: scoreVideo(v, title, year) }))
    .sort((a, b) => b.s - a.s)
  const best = ranked[0]
  return best && best.s >= 6 ? best.id : null
}

const T0 = Date.now()
let fetches = 0
let patched = 0

for (const kind of KINDS) {
  if (!FILES[kind]) { console.error('unknown kind', kind); process.exit(1) }
  const fp = path.join(ROOT, 'src', 'lib', FILES[kind])
  const fileData = JSON.parse(fs.readFileSync(fp, 'utf8'))
  const isMovie = kind === 'movie'
  const data = isMovie ? fileData : fileData
  const arr = isMovie ? data.movies : data
  const todo = arr.filter((m) => m && m.title && !m.trailerYouTubeId).slice(0, LIMIT)
  console.log(`\n[${kind}] ${todo.length} missing trailers of ${arr.length} (file ${FILES[kind]})`)

  let done = 0
  for (const e of todo) {
    const year = e.year && e.year > 0 ? e.year : null
    let id = await searchYT(`${e.title} ${year ? `(${year}) ` : ''}trailer`, e.title, year)
    fetches++
    if (!id && !year) {
      id = await searchYT(`${e.title} trailer`, e.title, null)
      fetches++
    }
    if (id) {
      e.trailerYouTubeId = id
      e.trailerSource = 'youtube-search'
      patched++
    }
    done++
    if (done % 10 === 0) console.log(`  ${kind} ${done}/${todo.length} (fetches ${fetches}, patched ${patched}) ${((Date.now() - T0) / 60000).toFixed(1)}m`)
    await delay(DELAY)
  }

  if (!NO_WRITE) {
    fs.writeFileSync(fp, JSON.stringify(isMovie ? { ...fileData, movies: arr } : arr, null, 2))
  }
}

console.log(`\ndone: ${fetches} YouTube searches, ${patched} entries patched in ${((Date.now() - T0) / 60000).toFixed(1)}m${NO_WRITE ? ' (dry-run, nothing written)' : ''}`)