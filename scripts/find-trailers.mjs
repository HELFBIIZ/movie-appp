// Finds official trailer candidates on YouTube for catalog entries lacking a
// trailer. Writes src/lib/_trailer-candidates.json with { slug: [ {id,title} ] }.
//
// Usage: node scripts/find-trailers.mjs               (searches all missing)
//        node scripts/find-trailers.mjs slug1,slug2   (searches only these)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CATALOG = path.join(__dirname, '..', 'src', 'lib', 'kdramas.json')
const OUT = path.join(__dirname, '..', 'src', 'lib', '_trailer-candidates.json')

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const only = args.length ? new Set(args[0].split(',').map((s) => s.trim())) : null
const CONCURRENCY = 6

async function get(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.ok) return await res.text()
    } catch (e) { /* retry */ }
    await delay(800 * (attempt + 1))
  }
  throw new Error('yt fetch failed')
}

function parseResults(html) {
  const results = []
  const re = /"videoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"/g
  let m
  while ((m = re.exec(html)) !== null) {
    results.push({ id: m[1], title: m[2].replace(/\\u0026/g, '&') })
  }
  return results
}

async function score(k) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${k.title} ${k.year} official trailer`)}`
  const res = await get(url)
  const parsed = parseResults(res)
  const scored = parsed.map((p, idx) => {
    const t = p.title.toLowerCase()
    let s = Math.max(0, 30 - idx * 3)
    if (t.includes('trailer')) s += 10
    if (t.includes('official') || t.includes('teaser')) s += 4
    if (t.includes('netflix')) s += 2
    return { ...p, score: s }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 5)
}

const kdramas = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {}
const targets = kdramas.filter(
  (k) => !k.trailerYouTubeId && !(k.slug in existing) && (only ? only.has(k.slug) : true)
)

let idx = 0
let ok = 0
let fail = 0

async function worker() {
  while (idx < targets.length) {
    const k = targets[idx++]
    try {
      existing[k.slug] = await score(k)
      ok++
      console.log(`OK ${k.slug} (${existing[k.slug].length} hits)`)
    } catch (e) {
      fail++
      console.error(`FAIL ${k.slug}: ${e.message}`)
    }
    if (ok % 25 === 0) fs.writeFileSync(OUT, JSON.stringify(existing, null, 2))
    await delay(150)
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))
fs.writeFileSync(OUT, JSON.stringify(existing, null, 2))
console.log(`\nDone. ${ok} ok, ${fail} failed. Candidates for ${Object.keys(existing).length} slugs in ${OUT}`)