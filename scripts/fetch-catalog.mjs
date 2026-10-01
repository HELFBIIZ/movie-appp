// Builds src/lib/movies.generated.mjs fetching real licensed data via WatchMode
// for the ~400 most popular movie titles.
// Output is a merged artifact with all pages/animals/streaming + movies.
// Usage: node scripts/fetch-catalog.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

function loadEnv(key) {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
  const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return m ? m[1].trim() : ''
}

const apiKey = loadEnv('WATCHMODE_API_KEY')
if (!apiKey) {
  console.error('WATCHMODE_API_KEY not found in .env.local')
  process.exit(1)
}

async function get(pathname, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(
      `https://api.watchmode.com/v1${pathname}${pathname.includes('?') ? '&' : '?'}apiKey=${apiKey}`,
      { cache: 'no-store' }
    )
    if (res.ok) return res.json()
    if (res.status === 429 || res.status === 503) {
      await delay(2000 * (attempt + 1))
      continue
    }
    return null
  }
  return null
}

const LANG_MAP = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi', pt: 'Portuguese',
  ru: 'Russian', ar: 'Arabic', nl: 'Dutch', sv: 'Swedish', da: 'Danish',
  no: 'Norwegian', fi: 'Finnish', tr: 'Turkish', pl: 'Polish', he: 'Hebrew',
  th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay', el: 'Greek',
  cs: 'Czech', hu: 'Hungarian', ro: 'Romanian', uk: 'Ukrainian', bg: 'Bulgarian',
}

const GENRE_MAP = {
  'Science Fiction': 'Sci-Fi',
  'TV Movie': 'Drama',
  'War & Politics': 'War',
  'Kids & Family': 'Family',
  'Action & Adventure': 'Action',
}

function mapGenres(names = []) {
  return names.slice(0, 4).map((g) => GENRE_MAP[g] || g)
}

function slugify(title) {
  return String(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// gather title ids from list-titles (popularity desc), skipping duplicates,
// non-movies, and anything without a tmdb_id
const want = 470 // collect extra to allow skips
const idSeen = new Set()
const titles = []

for (let page = 1; titles.length < want && page <= 25; page++) {
  const data = await get(`/list-titles/?types=movie&sort_by=popularity_desc&limit=50&page=${page}`)
  if (!data?.titles?.length) break
  for (const t of data.titles) {
    if (!t.tmdb_id || t.type !== 'movie' || idSeen.has(t.id)) continue
    idSeen.add(t.id)
    titles.push(t)
  }
  if (titles.length >= want) titles.length = want
  console.log(`fetching titles page ${page}: ${titles.length}/${want}`)
  await delay(300)
}

console.log(`\ncollected ${titles.length} title ids, fetching details...\n`)

const movies = []
const slugSeen = new Set()

for (const t of titles) {
  const details = await get(`/title/${t.id}/details/`)
  if (!details?.title || !details?.posterMedium) {
    console.log(`skip ${t.title}: no details/poster`)
    await delay(400)
    continue
  }

  const slug = slugify(details.title)
  if (!slug || slugSeen.has(slug)) {
    console.log(`skip ${details.title}: dup/empty slug`)
    await delay(400)
    continue
  }
  slugSeen.add(slug)

  const runtime = details.runtime_minutes
    ? `${Math.floor(details.runtime_minutes / 60)}h ${String(details.runtime_minutes % 60).padStart(2, '0')}m`
    : 'N/A'
  const trailerYouTubeId = extractYouTubeId(details.trailer)
  const currentYear = new Date().getFullYear()
  const category =
    details.year >= currentYear
      ? 'upcoming'
      : details.user_rating >= 8.0
        ? 'top-rated'
        : 'popular'

  movies.push({
    slug,
    title: details.title,
    year: details.year || 0,
    rating: details.user_rating ? Math.round(details.user_rating * 10) / 10 : null,
    genres: mapGenres(details.genre_names || []),
    runtime,
    language: LANG_MAP[details.original_language] || 'English',
    director: '',
    cast: [],
    plot: details.plot_overview || '',
    trailerYouTubeId,
    category,
    tmdbId: details.tmdb_id || null,
    poster: details.posterMedium || null,
    banner: details.backdrop || null,
  })

  console.log(`✓ ${details.year} ${details.title} (${runtime}, ${movies.length})`)
  await delay(400)
}

function extractYouTubeId(url) {
  if (!url) return null
  const m = String(url).match(/[?&]v=([A-Za-z0-9_-]{11})|youtu\.be\/([A-Za-z0-9_-]{11})/)
  return m ? (m[1] || m[2]) : null
}

const out = {
  movies,
  generated: new Date().toISOString().split('T')[0],
  count: movies.length,
}

fs.writeFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'movies.generated.json'),
  JSON.stringify(out, null, 2)
)
console.log(`\nWrote src/lib/movies.generated.json with ${movies.length} movies`)