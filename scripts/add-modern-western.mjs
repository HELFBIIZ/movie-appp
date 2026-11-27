// scripts/add-modern-western.mjs — backfill MODERN (2020–2026) Western-genre TV
// series into src/lib/western.json from TMDB discover/tv?with_genres=37.
//
// Reasoning: the bulk importer already pulled every genre-37 title that existed
// at scrape time (as popularity-ranked pages). Newer 2020–2026 shows get added
// to TMDB over time, so this script re-scrapes ONLY the 2020–2026 window
// (first_air_date.gte=2020-01-01 & first_air_date.lte=2026-12-31), dedupes by
// tmdbId+slug against the committed western.json, appends anything missing, and
// enriches episode counts per title via /tv/{id}.
//
// Usage: node scripts/add-modern-western.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const WESTERN_FILE = path.join(ROOT, 'src', 'lib', 'western.json')
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
const WINDOW = ['2020-01-01', '2026-12-31']

async function tmdb(pathname) {
  const res = await fetch(`https://api.themoviedb.org/3${pathname}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (res.status === 429 || res.status >= 500) {
    await delay(1500)
    return tmdb(pathname)
  }
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${pathname} ${(await res.text()).slice(0, 200)}`)
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

const { genres } = await tmdb('/genre/tv/list')
const genreNames = new Map((genres || []).map((g) => [g.id, g.name]))

const catalog = JSON.parse(fs.readFileSync(WESTERN_FILE, 'utf8'))
const byId = new Set(catalog.map((x) => x.tmdbId).filter(Boolean))
const bySlug = new Set(catalog.map((x) => x.slug))

const endpoint = `/discover/tv?with_genres=37&without_genres=99&first_air_date.gte=${WINDOW[0]}&first_air_date.lte=${WINDOW[1]}&vote_count.gte=0&sort_by=popularity.desc&include_adult=false&page=`
const found = []

for (let page = 1; page <= 50; page++) {
  const data = await tmdb(endpoint + page)
  const results = data.results || []
  if (!results.length) break
  found.push(...results)
  if (page >= data.total_pages) break
  await delay(300)
}

console.log(`live window (2020–2026, genre 37): ${found.length} titles`)
const added = []
const skipped = { dup: 0, empty: 0 }

for (const m of found) {
  const e = {
    slug: slugify(m.name || ''),
    title: m.name || '',
    year: (m.first_air_date || '').slice(0, 4) || null,
    rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    genres: (m.genre_ids || []).map((id) => genreNames.get(id)).filter(Boolean).slice(0, 4),
    runtime: fmtRuntime((m.episode_run_time || [])[0]),
    language: 'English',
    director: '',
    cast: [],
    plot: m.overview || '',
    trailerYouTubeId: null,
    category: 'western',
    tmdbId: m.id,
    poster: m.poster_path ? `${IMG}w500${m.poster_path}` : null,
    banner: m.backdrop_path ? `${IMG}w1280${m.backdrop_path}` : null,
    episodes: m.number_of_episodes || 0,
  }
  if (!e.slug || !e.tmdbId) { skipped.empty++; continue }
  if (byId.has(e.tmdbId) || bySlug.has(e.slug)) { skipped.dup++; continue }
  catalog.push(e)
  byId.add(e.tmdbId)
  bySlug.add(e.slug)
  added.push(e)
}

// Enrich any modern series missing episode counts.
const missing = added.filter((e) => !(e.episodes > 0))
let enriched = 0
for (const e of missing) {
  try {
    const d = await tmdb(`/tv/${e.tmdbId}`)
    if (d) {
      e.episodes = d.number_of_episodes || e.episodes || 0
      const rt = (d.episode_run_time || [])[0]
      if (rt) e.runtime = fmtRuntime(rt)
      if (!e.plot && d.overview) e.plot = d.overview
      if ((d.vote_count || 0) >= 1 && d.vote_average && !e.rating) e.rating = Math.round(d.vote_average * 10) / 10
      enriched++
    }
  } catch { /* keep discovered entry */ }
  await delay(250)
}
if (missing.length) console.log(`episode enrichment: ${enriched}/${missing.length}`)

// Backfill missing years on all catalog entries (first_air_date trains the
// modern-western window filter, which keys on `year`).
const noYear = catalog.filter((e) => !e.year)
let yearFixed = 0
for (const e of noYear) {
  try {
    const d = await tmdb(`/tv/${e.tmdbId}`)
    if (d && d.first_air_date) {
      e.year = parseInt(d.first_air_date.slice(0, 4), 10)
      yearFixed++
    }
  } catch { /* keep */ }
  await delay(200)
}
if (noYear.length) console.log(`year backfill: ${yearFixed}/${noYear.length}`)

fs.writeFileSync(WESTERN_FILE, JSON.stringify(catalog, null, 2))
const modern = catalog.filter((m) => ((m.year ?? 0) >= 2020 && (m.year ?? 0) <= 2026)).length
console.log(`\nadded ${added.length} new modern western series; ${skipped.dup} dup, ${skipped.empty} empty; catalog now ${catalog.length} (modern 2020–2026: ${modern})`)