// Builds src/lib/streaming.json: slug -> [Streaming service names in the US]
// using the WatchMode API key stored in .env.local. Only licensed providers.
// Usage: node scripts/fetch-streaming.mjs
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

async function get(pathname) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(
      `https://api.watchmode.com/v1${pathname}${pathname.includes('?') ? '&' : '?'}apiKey=${apiKey}`,
      { cache: 'no-store' }
    )
    if (res.ok) return res.json()
    if (res.status === 429 || res.status === 503) {
      await delay(1500 * (attempt + 1))
      continue
    }
    return null
  }
  return null
}

const posters = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'posters.json'), 'utf8')
)

const results = {}
for (const [slug, art] of Object.entries(posters)) {
  if (!art?.tmdbId) continue

  const search = await get(
    `/search/?search_field=tmdb_movie_id&search_value=${encodeURIComponent(art.tmdbId)}`
  )
  const title =
    (search?.title_results || []).find(
      (r) => String(r.tmdb_id) === String(art.tmdbId) && r.tmdb_type === 'movie'
    ) || (search?.title_results || [])[0]

  if (!title?.id) {
    console.log(`${slug}: no title`)
    await delay(450)
    continue
  }

  const sources = await get(`/title/${title.id}/sources/`)
  if (!Array.isArray(sources)) {
    console.log(`${slug}: no sources`)
    await delay(450)
    continue
  }

  const seen = new Set()
  const services = []
  for (const s of sources) {
    const region = (s.region || 'US').toUpperCase()
    if (region !== 'US') continue
    const name = (s.name || '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    services.push(name)
  }

  results[slug] = services
  console.log(`${slug}: ${services.join(', ') || '(none)'}`)
  await delay(450)
}

fs.writeFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'streaming.json'),
  JSON.stringify(results, null, 2)
)
console.log('\nWrote src/lib/streaming.json')