// scripts/fill-posters.mjs — fill missing posters/banners from Cinemeta (keyless).
//   kdramas.json / western.json : inline poster + banner
//   kdrama-posters.json         : poster map kept in sync for the merge layer
// Usage: node scripts/fill-posters.mjs [--apply] [--limit=N]
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) })
      const t = await r.text()
      if (t.startsWith('{')) return JSON.parse(t)
    } catch {}
    await sleep(1500 * (i + 1))
  }
  return null
}

const tokens = (s) =>
  String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3)

// Fraction of the query's words that appear in the candidate, plus a bonus when
// the release year agrees. K-dramas are routinely listed under their English
// title ("Terius Behind Me" -> "My Secret Terrius"), so a plain exact-title
// comparison misses them even when the match is correct.
function score(queryTitle, queryYear, name, releaseInfo) {
  const qt = tokens(queryTitle)
  if (!qt.length) return 0
  const ct = new Set(tokens(name))
  const hit = qt.filter((w) => ct.has(w)).length
  let s = hit / qt.length
  const yr = Number(String(releaseInfo || '').slice(0, 4))
  if (queryYear && yr && yr === queryYear) s += 0.3
  else if (queryYear && yr && Math.abs(yr - queryYear) <= 1) s += 0.1
  return s
}

const upgrade = (u, size) => (u || '').replace(/_SX\d+\./, `_${size}.`).replace(/_V1_SX\d+/, '_V1_FMjpg_UX' + size)

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0)

  const kdramas = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/lib/kdramas.json'), 'utf8'))
  const western = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/lib/western.json'), 'utf8'))
  const kposters = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/lib/kdrama-posters.json'), 'utf8'))

  const targets = []
  for (const x of western) if (!x.poster || !x.banner) targets.push({ kind: 'western', e: x })
  for (const x of kdramas) if (!x.poster || !x.banner) targets.push({ kind: 'kdrama', e: x })
  const todo = limit ? targets.slice(0, limit) : targets
  console.log(`Missing poster/banner: ${targets.length} (todo: ${todo.length}, apply=${apply})`)

  let ok = 0, partial = 0, skip = 0
  for (let i = 0; i < todo.length; i++) {
    const { kind, e } = todo[i]
    const type = 'series'
    const res = await getJson(
      `https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(e.title)}.json`
    )
    const metas = res?.metas || []
    if (!res) {
      skip++
      console.log(`[${i + 1}/${todo.length}] ${e.slug} RETRY-LATER (search unavailable)`)
      await sleep(3000)
      continue
    }
    let best = null
    for (const m of metas) {
      const s = score(e.title, e.year, m.name, m.releaseInfo)
      if (!best || s > best.s) best = { s, m }
    }
    if (!best || best.s < 0.5) {
      skip++
      console.log(`[${i + 1}/${todo.length}] ${e.slug} SKIP (best="${best?.m?.name}" s=${best?.s?.toFixed(2)})`)
      await sleep(2500)
      continue
    }
    let poster = upgrade(best.m.poster, '500')
    let banner = best.m.background || null
    const imdb = best.m.imdb_id || best.m.id
    if (imdb && (banner || poster)) {
      const meta = await getJson(`https://v3-cinemeta.strem.io/meta/${type}/${imdb}.json`)
      if (meta?.meta) {
        poster = upgrade(meta.meta.poster, '500') || poster
        banner = meta.meta.background || banner
      }
    }
    if (poster && banner) ok++
    else partial++
    console.log(`[${i + 1}/${todo.length}] ${e.slug} <- "${best.m.name}" s=${best.s.toFixed(2)} poster:${!!poster} banner:${!!banner}`)
    if (apply) {
      if (poster) e.poster = e.poster || poster
      if (banner) e.banner = e.banner || banner
      if (kind === 'kdrama') {
        kposters[e.slug] = {
          ...(kposters[e.slug] || {}),
          poster: e.poster || poster,
          banner: e.banner || banner,
          tmdbId: e.tmdbId || kposters[e.slug]?.tmdbId || null,
        }
      }
    }
    await sleep(700)
  }

  console.log(`\nOK:${ok} PARTIAL:${partial} SKIP:${skip}`)
  if (apply) {
    fs.writeFileSync(path.join(ROOT, 'src/lib/western.json'), JSON.stringify(western, null, 2))
    fs.writeFileSync(path.join(ROOT, 'src/lib/kdramas.json'), JSON.stringify(kdramas, null, 2))
    fs.writeFileSync(path.join(ROOT, 'src/lib/kdrama-posters.json'), JSON.stringify(kposters, null, 2))
    console.log('Wrote western.json + kdramas.json + kdrama-posters.json')
  }
}
main()
