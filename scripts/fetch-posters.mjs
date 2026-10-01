// Resolves exact poster + backdrop URLs from TheMovieDB's public CDN for
// every real movie in the catalog. Fictional/upcoming titles get null and
// keep the generated artwork fallback.
//
// Requires: node >= 18 (global fetch)
// Usage: node scripts/fetch-posters.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
    })
    if (res.ok) return await res.text()
    if (res.status === 429 || res.status === 503) {
      await delay(2000 * (attempt + 1))
      continue
    }
    throw new Error(`HTTP ${res.status}`)
  }
  throw new Error('rate limited after retries')
}

function parseCards(html) {
  const cards = []
  const pattern =
    /<a class="flex w-full"[^>]*data-media-type="movie"[^>]*href="\/movie\/(\d+)-([^"]+)"[^>]*>[\s\S]*?w94_and_h141_face\/([A-Za-z0-9_./-]+?)(?: |")/g
  let m
  while ((m = pattern.exec(html)) !== null) {
    cards.push({ id: m[1], slug: m[2], poster: m[3] })
  }
  return cards
}

function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function slugify(s) {
  return normalize(s).replace(/\s+/g, '-')
}

function slugsMatch(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  const c = (x) => x.replace(/-+/g, '-')
  return c(a) === c(b)
}

async function findMovie(title, year) {
  const html = await get(`https://www.themoviedb.org/search?query=${encodeURIComponent(title)}`)
  const cards = parseCards(html)
  const targetSlug = slugify(title)

  // 1. Exact slug match (TMDb slugs are locale-independent)
  const bySlug = cards.find((c) => slugsMatch(c.slug, targetSlug))
  if (bySlug) return bySlug

  // 2. Slug containment (handles suffixes like E.T. -> et-the-extra-terrestrial)
  const contained =
    cards.find((c) => c.slug.includes(targetSlug) || targetSlug.includes(c.slug)) || null
  if (contained) return contained

  // 3. Fall back to the top movie result
  return cards[0] || null
}

async function findBackdrop(id, slug) {
  const html = await get(`https://www.themoviedb.org/movie/${id}-${slug}`)
  const wide = html.match(/media\.themoviedb\.org\/t\/p\/w1920_and_h800_multi_faces\/([A-Za-z0-9_./-]+)/)
  if (wide) return wide[1]
  const and720 = html.match(/media\.themoviedb\.org\/t\/p\/w1280_and_h720_multi_faces\/([A-Za-z0-9_./-]+)/)
  return and720 ? and720[1] : null
}

// Fetches the detail page and pulls the poster + backdrop paths directly.
async function findArt(id, slug) {
  const html = await get(`https://www.themoviedb.org/movie/${id}-${slug}`)
  const poster =
    html.match(/og:image[^>]*content="https:\/\/media\.themoviedb\.org\/t\/p\/w500\/([A-Za-z0-9_./-]+)"/)?.[1] ||
    html.match(/media\.themoviedb\.org\/t\/p\/w342_and_h513_bestv2\/([A-Za-z0-9_./-]+)/)?.[1] ||
    html.match(/media\.themoviedb\.org\/t\/p\/w500_and_h750_bestv2\/([A-Za-z0-9_./-]+)/)?.[1] ||
    null
  const wide = html.match(/media\.themoviedb\.org\/t\/p\/w1920_and_h800_multi_faces\/([A-Za-z0-9_./-]+)/)
  return { poster, backdrop: wide ? wide[1] : null }
}

// Load movies directly from the source of truth (movies.js)
const moviesJs = path.join(__dirname, '..', 'src', 'lib', 'movies.js')
const moviesModule = await import(pathToFileURL(moviesJs).href).catch(() => {
  // import executes the file; it has side-effect-free exports, but fall back to babel-less parse below if it fails
  return null
})

let catalog = []
if (moviesModule?.movies && Array.isArray(moviesModule.movies) && moviesModule.movies.length) {
  const seen = new Set()
  for (const mov of moviesModule.movies) {
    if (!seen.has(mov.slug)) {
      seen.add(mov.slug)
      catalog.push({ slug: mov.slug, title: mov.title, year: mov.year })
    }
  }
}

if (!catalog.length) {
  // Parse the raw list as a fallback
  const src = fs.readFileSync(moviesJs, 'utf8')
  const slugRe = /slug: '([^']+)'/g
  const titleRe = /title:\s*'([^']*)'|title:\s*"([^"]*)"/g
  const yearRe = /year: (\d+)/g
  const slugs = [...src.matchAll(slugRe)].map((m) => m[1])
  const titles = [...src.matchAll(titleRe)].map((m) => m[1] || m[2])
  const years = [...src.matchAll(yearRe)].map((m) => m[1])
  catalog = slugs.map((slug, i) => ({ slug, title: titles[i], year: years[i] }))
}

// Manual overrides for entries that fuzzy matching gets wrong.
// value: TMDB id+slug (string) to resolve, or null to keep generated artwork.
const overrides = {
  'final-signal': null,
  stormline: null,
  'specter-harbor': null,
  'atlas-below': null,
  'aurora-drift': null,
  parasite: '496243-parasite',
  'spirited-away': '129-spirited-away',
}

const results = {}
for (const { slug, title, year } of catalog) {
  const poster = 'https://image.tmdb.org/t/p/w500/'
  const banner = 'https://image.tmdb.org/t/p/w1280/'
  try {
    let movie
    if (slug in overrides) {
      if (!overrides[slug]) {
        results[slug] = null
        console.log(`${slug} | ${title} (${year}): SKIPPED (fictional)`)
        continue
      }
      const [id, ...slugParts] = overrides[slug].split('-')
      movie = { id, slug: slugParts.join('-') }
    } else {
      movie = await findMovie(title, year)
    }
    if (!movie) {
      results[slug] = null
      console.log(`${slug} | ${title} (${year}): NO MATCH`)
      await delay(450)
      continue
    }
    let backdrop
    if (slug in overrides) {
      const art = await findArt(movie.id, movie.slug)
      movie.poster = art.poster
      backdrop = art.backdrop
    } else {
      backdrop = await findBackdrop(movie.id, movie.slug)
    }
    if (!movie.poster) {
      results[slug] = null
      console.log(`${slug} | ${title} (${year}): NO POSTER ART`)
      await delay(450)
      continue
    }
    results[slug] = {
      poster: poster + movie.poster,
      banner: backdrop ? banner + backdrop : null,
      tmdbId: movie.id,
    }
    console.log(`${slug} | ${title} (${year}) -> /movie/${movie.id}-${movie.slug} ${backdrop ? 'BACKDROP OK' : 'no backdrop'}`)
  } catch (e) {
    console.error(`${slug} | ${title}: FAILED ${e.message}`)
    results[slug] = null
  }
  await delay(450)
}

fs.writeFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'posters.json'),
  JSON.stringify(results, null, 2)
)
console.log('\nWrote src/lib/posters.json')