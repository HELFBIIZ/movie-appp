// scripts/enrich-catalog.mjs — add missing popular movies + KR series (all keyless).
// Movies: IMDb missing-movies.json → Cinemeta enrich → movies.generated.json
// K-dramas: TVMaze KR discovery → Cinemeta enrich → kdramas.json + kdrama-posters.json
// Usage: node scripts/enrich-catalog.mjs --movies=100 --kdramas=60 [--apply]
import fs from 'fs'
import path from 'path'
import os from 'os'

const __dirname = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''))
const ROOT = path.join(__dirname, '..')
const TMP = path.join(os.tmpdir(), 'imdb')
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD')
  .replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) })
      const t = await r.text()
      if (t.startsWith('{')) return JSON.parse(t)
    } catch {}
    await sleep(2500 * (i + 1))
  }
  return null
}
const cinemeta = (type, imdb) => getJson(`https://v3-cinemeta.strem.io/meta/${type}/${imdb}.json`)
const fmtRuntime = (min) => min ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : 'N/A'
const stripHtml = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim()

function existingSlugs() {
  const set = new Set()
  const gen = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'movies.generated.json'), 'utf8'))
  for (const m of gen.movies || []) if (m?.slug) set.add(m.slug)
  const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'movies.js'), 'utf8')
  for (const m of src.matchAll(/slug:\s*'([^']+)'/g)) set.add(m[1])
  for (const f of ['kdramas.json', 'western.json']) {
    for (const m of JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', f), 'utf8'))) if (m?.slug) set.add(m.slug)
  }
  return set
}

async function enrichMovies(n, apply) {
  const missing = JSON.parse(fs.readFileSync(path.join(TMP, 'missing-movies.json'), 'utf8')).slice(0, n)
  const have = existingSlugs()
  const added = []
  for (let i = 0; i < missing.length; i++) {
    const m = missing[i]
    const slug = slugify(m.title)
    if (!slug || have.has(slug)) continue
    const meta = (await cinemeta('movie', m.tconst))?.meta
    await sleep(800)
    if (!meta) { console.log(`[${i + 1}] ${m.title} SKIP (no cinemeta)`); continue }
    const year = m.year || Number(meta.year) || 0
    const entry = {
      slug, title: meta.name || m.title, year,
      rating: m.rating ?? null, genres: (meta.genres || m.genres || []).slice(0, 4),
      runtime: fmtRuntime(meta.runtime), language: 'English',
      director: Array.isArray(meta.director) ? meta.director.join(', ') : (meta.director || ''),
      cast: (meta.cast || []).slice(0, 5), plot: meta.description || '',
      category: year >= new Date().getFullYear() ? 'upcoming' : (m.rating >= 8 ? 'top-rated' : 'popular'),
      tmdbId: meta.moviedb_id || null,
      poster: meta.poster || null, banner: meta.background || null,
    }
    added.push(entry)
    have.add(slug)
    console.log(`[${i + 1}] + ${slug} (${year}) poster:${entry.poster ? 'yes' : 'NO'} tmdb:${entry.tmdbId || 'NO'}`)
  }
  if (apply && added.length) {
    const p = path.join(ROOT, 'src', 'lib', 'movies.generated.json')
    const gen = JSON.parse(fs.readFileSync(p, 'utf8'))
    gen.movies.push(...added)
    gen.count = gen.movies.length
    fs.writeFileSync(p, JSON.stringify(gen, null, 2))
    console.log(`Appended ${added.length} movies`)
  }
  return added
}

async function discoverKR() {
  // TVMaze show index: recent shows have high ids (last pages)
  let maxPage = 0
  // find last page via 404 probing from a high guess downward is slow; instead
  // fetch known-late pages directly (index grows ~1 page/month; 300+ pages exist)
  const pages = []
  for (let p = 290; p <= 320; p++) pages.push(p)
  const shows = []
  for (const p of pages) {
    try {
      const r = await fetch(`https://api.tvmaze.com/shows?page=${p}`, { headers: { 'User-Agent': 'VXNTA/1.0' }, signal: AbortSignal.timeout(25000) })
      if (r.status === 404) { maxPage = p - 1; break }
      const arr = await r.json()
      if (Array.isArray(arr)) shows.push(...arr)
    } catch {}
    await sleep(600)
  }
  return shows.filter((s) => s?.network?.country?.code === 'KR' || s?.webChannel?.country?.code === 'KR')
}

async function enrichKdramas(n, apply) {
  const have = existingSlugs()
  console.log('Discovering KR shows on TVMaze...')
  const kr = await discoverKR()
  console.log(`KR shows found on recent pages: ${kr.length}`)
  kr.sort((a, b) => (b.weight || 0) - (a.weight || 0))
  const added = []
  const posters = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'kdrama-posters.json'), 'utf8'))
  for (const s of kr) {
    if (added.length >= n) break
    const slug = slugify(s.name)
    if (!slug || have.has(slug)) continue
    const imdb = s.externals?.imdb
    const meta = imdb ? (await cinemeta('series', imdb))?.meta : null
    await sleep(800)
    // episodes count
    let episodes = null
    try {
      const r = await fetch(`https://api.tvmaze.com/shows/${s.id}/episodes`, { headers: { 'User-Agent': 'VXNTA/1.0' }, signal: AbortSignal.timeout(20000) })
      if (r.ok) episodes = (await r.json()).length || null
    } catch {}
    const entry = {
      slug, title: s.name, year: Number((s.premiered || '').slice(0, 4)) || null,
      rating: s.rating?.average ?? null, genres: s.genres || [],
      episodes, runtime: s.runtime ? fmtRuntime(s.runtime) : 'N/A', language: 'Korean',
      director: '', cast: (meta?.cast || []).slice(0, 5),
      plot: stripHtml(s.summary) || meta?.description || '',
      category: 'kdrama',
      poster: s.image?.original || s.image?.medium || meta?.poster || null,
      banner: s.image?.original || meta?.background || null,
    }
    added.push(entry)
    have.add(slug)
    if (apply) posters[slug] = { poster: entry.poster, banner: entry.banner, tmdbId: meta?.moviedb_id || null }
    console.log(`+ ${slug} (${entry.year}) eps:${episodes} rating:${entry.rating} poster:${entry.poster ? 'yes' : 'NO'}`)
    await sleep(600)
  }
  if (apply && added.length) {
    const kp = path.join(ROOT, 'src', 'lib', 'kdramas.json')
    const arr = JSON.parse(fs.readFileSync(kp, 'utf8'))
    arr.push(...added)
    fs.writeFileSync(kp, JSON.stringify(arr, null, 2))
    fs.writeFileSync(path.join(ROOT, 'src', 'lib', 'kdrama-posters.json'), JSON.stringify(posters, null, 2))
    console.log(`Appended ${added.length} kdramas`)
  }
  return added
}

async function main() {
  const args = process.argv.slice(2)
  const get = (k) => Number(args.find((a) => a.startsWith(k + '='))?.split('=')[1] || 0)
  const apply = args.includes('--apply')
  const nm = get('--movies'), nk = get('--kdramas')
  if (nm) await enrichMovies(nm, apply)
  if (nk) await enrichKdramas(nk, apply)
  if (!nm && !nk) console.error('Usage: --movies=N --kdramas=N [--apply]')
}
main()
