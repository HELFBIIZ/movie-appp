// scripts/fill-posters.mjs — fill missing western/kdrama posters via TVMaze (keyless).
// Usage: node scripts/fill-posters.mjs [--apply] [--limit=N]
// Without --apply: dry run, prints matches. With --apply: writes JSON files.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
function similarity(a, b) {
  // token overlap ratio
  const ta = new Set(norm(a).split('').filter(Boolean))
  const tb = new Set(norm(b).split('').filter(Boolean))
  void ta; void tb
  const wa = (a || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  const wb = new Set((b || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))
  if (!wa.length) return 0
  const hit = wa.filter((w) => wb.has(w)).length
  return hit / wa.length
}

async function tvmazeSearch(q) {
  const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`, {
    headers: { 'User-Agent': 'VXNTA/1.0' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error('tvmaze ' + res.status)
  return res.json()
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0)

  const western = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'western.json'), 'utf8'))
  const kdramas = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'kdramas.json'), 'utf8'))
  const kposters = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'kdrama-posters.json'), 'utf8'))

  const targets = []
  for (const x of western) if (!x.poster) targets.push({ kind: 'western', slug: x.slug, title: x.title, year: x.year })
  for (const x of kdramas) if (!kposters[x.slug]?.poster) targets.push({ kind: 'kdrama', slug: x.slug, title: x.title, year: x.year })
  const todo = limit ? targets.slice(0, limit) : targets
  console.log(`Missing posters: ${targets.length} (todo: ${todo.length}, apply=${apply})`)

  const wOut = {}
  let ok = 0, skip = 0, fail = 0
  for (let i = 0; i < todo.length; i++) {
    const t = todo[i]
    try {
      const results = await tvmazeSearch(t.title)
      // pick best: prefer name similarity >= 0.5, highest score
      let best = null
      for (const r of results.slice(0, 5)) {
        const sim = similarity(t.title, r.show?.name)
        if (sim >= 0.5 && (!best || r.score > best.score)) best = { ...r, sim }
      }
      if (!best?.show?.image?.medium) {
        skip++
        console.log(`[${i + 1}/${todo.length}] ${t.slug} SKIP (no good match)`)
      } else {
        ok++
        const img = best.show.image.original || best.show.image.medium
        console.log(`[${i + 1}/${todo.length}] ${t.slug} OK <- "${best.show.name}" sim=${best.sim.toFixed(2)}`)
        if (apply) {
          if (t.kind === 'western') wOut[t.slug] = img
          else {
            kposters[t.slug] = { ...(kposters[t.slug] || {}), poster: img, banner: kposters[t.slug]?.banner || img }
          }
        }
      }
    } catch (e) {
      fail++
      console.log(`[${i + 1}/${todo.length}] ${t.slug} ERR ${e.message}`)
    }
    await sleep(1200)
  }
  console.log(`\n albeit OK:${ok} SKIP:${skip} ERR:${fail}`)
  if (apply && Object.keys(wOut).length) {
    // western posters live inline in western.json
    const wj = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'western.json'), 'utf8'))
    for (const [slug, poster] of Object.entries(wOut)) {
      const e = wj.find((x) => x.slug === slug)
      if (e) { e.poster = poster; if (!e.banner) e.banner = poster }
    }
    fs.writeFileSync(path.join(ROOT, 'src', 'lib', 'western.json'), JSON.stringify(wj, null, 2))
    fs.writeFileSync(path.join(ROOT, 'src', 'lib', 'kdrama-posters.json'), JSON.stringify(kposters, null, 2))
    console.log('Wrote western.json + kdrama-posters.json')
  } else if (apply) {
    fs.writeFileSync(path.join(ROOT, 'src', 'lib', 'kdrama-posters.json'), JSON.stringify(kposters, null, 2))
    console.log('Wrote kdrama-posters.json')
  }
}
main()
