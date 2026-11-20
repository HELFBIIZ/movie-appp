// scripts/find-missing.mjs — find popular IMDb titles absent from catalog.
// Reads IMDb datasets from %TEMP%/imdb (ratings, basics, akas).
// Output: missing-movies.json + missing-kdramas.json in same TEMP dir.
import fs from 'fs'
import path from 'path'
import os from 'os'
import zlib from 'zlib'
import readline from 'readline'

const DIR = path.join(os.tmpdir(), 'imdb')
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD')
  .replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

function pickTitle(primary, original) {
  if (/[a-zA-Z]{4,}/.test(primary || '')) return primary
  if (/[a-zA-Z]{4,}/.test(original || '')) return original
  return primary
}

async function loadRatings() {
  const map = new Map()
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(DIR, 'ratings.tsv.gz')).pipe(zlib.createGunzip()) })
  for await (const line of rl) {
    if (line.startsWith('tconst')) continue
    const [id, rating, votes] = line.split('\t')
    map.set(id, { rating: Number(rating), votes: Number(votes) })
  }
  return map
}

async function loadKR() {
  const set = new Set()
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(DIR, 'akas.tsv.gz')).pipe(zlib.createGunzip()) })
  for await (const line of rl) {
    if (line.startsWith('titleId')) continue
    const [id, , , region] = line.split('\t')
    if (region === 'KR') set.add(id)
  }
  return set
}

function catalogSlugs() {
  const root = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..')
  const set = new Set()
  const gen = JSON.parse(fs.readFileSync(path.join(root, 'src', 'lib', 'movies.generated.json'), 'utf8'))
  for (const m of (Array.isArray(gen) ? gen : gen.movies || [])) if (m?.slug) set.add(m.slug)
  const src = fs.readFileSync(path.join(root, 'src', 'lib', 'movies.js'), 'utf8')
  for (const m of src.matchAll(/slug:\s*'([^']+)'/g)) set.add(m[1])
  for (const f of ['kdramas.json', 'western.json']) {
    const arr = JSON.parse(fs.readFileSync(path.join(root, 'src', 'lib', f), 'utf8'))
    for (const m of arr) if (m?.slug) set.add(m.slug)
  }
  return set
}

async function main() {
  console.log('loading ratings...')
  const ratings = await loadRatings()
  console.log('ratings:', ratings.size)
  console.log('loading KR set...')
  const kr = await loadKR()
  console.log('KR titles:', kr.size)
  const have = catalogSlugs()
  console.log('catalog slugs:', have.size)

  const missingMovies = []
  const missingSeries = []
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(DIR, 'basics.tsv.gz')).pipe(zlib.createGunzip()) })
  for await (const line of rl) {
    if (line.startsWith('tconst')) continue
    const [id, type, primary, original, adult, year, , runtime, genres] = line.split('\t')
    if (adult === '1') continue
    const y = Number(year)
    const r = ratings.get(id)
    if (!r) continue
    if (type === 'movie' && y >= 2020 && r.votes >= 15000) {
      const title = pickTitle(primary, original)
      const slug = slugify(title)
      if (slug && !have.has(slug)) missingMovies.push({ tconst: id, title, year: y, rating: r.rating, votes: r.votes, runtime: runtime === '\\N' ? null : Number(runtime), genres: genres === '\\N' ? [] : genres.split(',') })
    } else if (type === 'tvSeries' && kr.has(id) && r.votes >= 2000) {
      const title = pickTitle(primary, original)
      const slug = slugify(title)
      if (slug && !have.has(slug)) missingSeries.push({ tconst: id, title, year: Number.isNaN(y) ? null : y, rating: r.rating, votes: r.votes, runtime: runtime === '\\N' ? null : Number(runtime), genres: genres === '\\N' ? [] : genres.split(',') })
    }
  }
  missingMovies.sort((a, b) => b.votes - a.votes)
  missingSeries.sort((a, b) => b.votes - a.votes)
  console.log('missing movies:', missingMovies.length, '| missing KR series:', missingSeries.length)
  fs.writeFileSync(path.join(DIR, 'missing-movies.json'), JSON.stringify(missingMovies.slice(0, 150), null, 2))
  fs.writeFileSync(path.join(DIR, 'missing-kdramas.json'), JSON.stringify(missingSeries.slice(0, 120), null, 2))
  console.log('--- TOP MOVIES ---')
  for (const m of missingMovies.slice(0, 40)) console.log(`${m.votes} ${m.rating} ${m.title} (${m.year}) [${m.genres.join('/')}]`)
  console.log('--- TOP KDRAMAS ---')
  for (const m of missingSeries.slice(0, 40)) console.log(`${m.votes} ${m.rating} ${m.title} (${m.year})`)
}
main()
