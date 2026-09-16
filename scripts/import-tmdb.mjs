// scripts/import-tmdb.mjs — resumable TMDB bulk importer for the runtime
// catalog (src/lib/movies.generated.json <- movies, src/lib/kdramas.json <- kdrama).
//
// WHY THIS FILE: the existing fetch-catalog.mjs pulls ~470 popular titles from
// WatchMode once. This importer is the "automated pipeline": it discovers 20
// titles per TMDB page by popularity, dedupes against the already-committed
// catalog (tmdbId + slug), appends in the exact repo entry shape, and keeps a
// progress marker so a 5000-title goal is reachable across many `--resume`
// runs without re-scraping.
//
// Usage:
//   node scripts/import-tmdb.mjs movie   --limit 500 [--page 1] [--resume]
//   node scripts/import-tmdb.mjs kdrama  --limit 500 [--resume]
//   node scripts/import-tmdb.mjs tv      --limit 500 [--resume]
//   node scripts/import-tmdb.mjs western --limit 2000 [--resume]   (TV genre 37 -> western.json)
//
// Totals: movies -> movies.generated.json (movies[]), tv/kdrama -> kdramas.json,
//         western -> western.json (Western-genre TV series).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PROGRESS_FILE = path.join(ROOT, 'data', 'import-progress.json')
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

const kind = process.argv[2] || 'movie'
const flag = (name, def) => {
  const eq = process.argv.find((x) => x.startsWith(`--${name}=`))
  if (eq) return eq.split('=')[1]
  const idx = process.argv.indexOf(`--${name}`)
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : def
}
const LIMIT = Math.max(1, parseInt(flag('limit', process.argv.includes('--resume') ? '2000' : '100'), 10))
const START_PAGE = process.argv.includes('--resume') ? null : parseInt(flag('page', '1'), 10)
const MAX_PAGES = 500

const IMG = 'https://image.tmdb.org/t/p/'
const LANG = { movie: 'English', tv: 'English', kdrama: 'Korean', western: 'English' }
const MOOD = { movie: 'popular', tv: 'popular', kdrama: 'kdrama', western: 'western' }

async function tmdb(pathname) {
  // Repo convention: Bearer auth (tmdb.js). Api keys may be a v4 token
  // (Bearer) or a v3 key (api_key) — Bearer works for both in current TMDB.
  const res = await fetch(`https://api.themoviedb.org/3${pathname}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (res.status === 429 || res.status >= 500) {
    await delay(1500)
    return tmdb(pathname)
  }
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200)
    throw new Error(`TMDB ${res.status}: ${pathname} ${body}`)
  }
  return res.json()
}

const slugify = (s) => String(s)
  .toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-')
  .replace(/-+/g, '-').replace(/^-|-$/g, '')

const fmtRuntime = (minutes) => {
  if (!minutes) return 'N/A'
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

const genreIds = new Map()
async function loadGenres() {
  const list = await tmdb(kind === 'movie' ? '/genre/movie/list' : '/genre/tv/list')
  for (const g of list.genres || []) genreIds.set(g.id, g.name)
}

function entryFrom(m, media) {
  const year = (m.release_date || m.first_air_date || '').slice(0, 4)
  const e = {
    slug: slugify(m.title || m.name || ''),
    title: m.title || m.name || '',
    year: year ? parseInt(year, 10) : 0,
    rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    genres: (m.genre_ids || []).map((id) => genreIds.get(id)).filter(Boolean).slice(0, 4),
    runtime: fmtRuntime(media === 'movie' ? null : (m.episode_run_time || [])[0]),
    language: LANG[kind] || 'English',
    director: '',
    cast: [],
    plot: m.overview || '',
    trailerYouTubeId: null,
    category: MOOD[kind] || 'popular',
    tmdbId: m.id,
    poster: m.poster_path ? `${IMG}${media === 'movie' ? 'w342' : 'w500'}${m.poster_path}` : null,
    banner: m.backdrop_path ? `${IMG}w1280${m.backdrop_path}` : null,
  }
  if (media !== 'movie') {
    e.episodes = m.number_of_episodes || 0
  }
  return e
}

// Load the target catalog + build seen sets (tmdbId + slug).
const MOVIE_FILE = path.join(ROOT, 'src', 'lib', 'movies.generated.json')
const KDRAMA_FILE = path.join(ROOT, 'src', 'lib', 'kdramas.json')
const WESTERN_FILE = path.join(ROOT, 'src', 'lib', 'western.json')
const targetFile = kind === 'movie'
  ? MOVIE_FILE
  : kind === 'western'
    ? WESTERN_FILE
    : KDRAMA_FILE
let targetData = []
try {
  targetData = JSON.parse(fs.readFileSync(targetFile, 'utf8'))
} catch {
  targetData = []
}
const list = Array.isArray(targetData)
  ? targetData
  : kind === 'movie'
    ? targetData.movies
    : targetData.kdramas || []

const seenSlug = new Set(list.map((x) => x.slug))
const seenId = new Set(list.map((x) => x.tmdbId).filter(Boolean))

await loadGenres()

// Determine starting page (resume continues from the saved marker).
let progress = {}
try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')) } catch {}
const savedPage = progress[kind]?.lastPage ?? 0
let page = START_PAGE !== null ? START_PAGE : savedPage + 1
const endpoint = kind === 'movie'
  ? '/discover/movie'
  : kind === 'kdrama'
    ? '/discover/tv?with_original_language=ko&first_air_date.gte=2005'
    : kind === 'western'
      ? '/discover/tv?with_genres=37&without_genres=99'
      : '/discover/tv'
const params = ['include_adult=false', 'sort_by=popularity.desc']
if (kind === 'movie') params.push('vote_count.gte=50')
if (kind === 'tv' || kind === 'kdrama') params.push('vote_count.gte=10')
if (kind === 'western') params.push('vote_count.gte=0')
params.push('page=')

const added = []
const skipped = { dup: 0, empty: 0 }

for (; added.length < LIMIT && page <= MAX_PAGES; page++) {
  const data = await tmdb(`${endpoint}?${params.join('&')}${page}`)
  const results = data.results || []
  if (!results.length) { console.log(`page ${page}: done (no results)`); break }
  for (const m of results) {
    const e = entryFrom(m, kind === 'movie' ? 'movie' : 'tv')
    if (!e.slug || !e.tmdbId) { skipped.empty++; continue }
    if (seenId.has(e.tmdbId) || seenSlug.has(e.slug)) { skipped.dup++; continue }
    list.push(e)
    seenId.add(e.tmdbId)
    seenSlug.add(e.slug)
    added.push(e)
  }
  progress[kind] = { lastPage: page, lastRun: new Date().toISOString(), addedTotal: (progress[kind]?.addedTotal ?? 0) + added.length }
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
  console.log(`page ${page}: +${added.length}/${LIMIT} (${list.length} total in file)`)
  if (added.length >= LIMIT) break
  await delay(300)
}

// Enrich TV entries missing episode counts (/discover/tv omits number_of_episodes).
if ((kind === 'western' || kind === 'tv' || kind === 'kdrama')) {
  const missing = list.filter((e) => !(e.episodes > 0))
  if (missing.length) {
    console.log(`\nenriching ${missing.length} TV title(s) with episode counts via /tv/{id}…`)
    let enriched = 0
    for (const e of missing) {
      try {
        const d = await tmdb(`/tv/${e.tmdbId}`)
        if (d) {
          e.episodes = d.number_of_episodes || e.episodes || 0
          const rt = (d.episode_run_time || [])[0]
          if (rt) e.runtime = fmtRuntime(rt)
          if (!e.plot && d.overview) e.plot = d.overview
          if ((d.vote_count || 0) >= 1 && d.vote_average) e.rating = Math.round(d.vote_average * 10) / 10
          enriched++
        }
      } catch {
        // some ids may be retired; keep the entry as discovered
      }
      await delay(350)
    }
    console.log(`enrichment: updated ${enriched}/${missing.length}`)
  }
}

// Persist in the repo's own shape.
if (kind === 'movie') {
  targetData.movies = list
  targetData.generated = new Date().toISOString().split('T')[0]
  targetData.count = list.length
  fs.writeFileSync(MOVIE_FILE, JSON.stringify(targetData, null, 2))
} else {
  const out = Array.isArray(targetData) ? list : { ...targetData, movies: list }
  fs.writeFileSync(targetFile, JSON.stringify(out, null, 2))
}

console.log(`\nimporter (${kind}) added ${added.length} new title(s); ${skipped.dup} dup, ${skipped.empty} empty; catalog now ${list.length}`)
console.log(`resume marker: page ${progress[kind]?.lastPage ?? page} → run again with --resume`)