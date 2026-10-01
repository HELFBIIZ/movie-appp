// Applies verified trailer IDs from _trailer-candidates.json into kdramas.json.
// For each entry lacking a trailer it walks the ranked candidates and keeps the
// first one that is LIVE (YouTube oEmbed responds) and whose video title shares
// meaningful tokens with the drama title (and mentions trailer/teaser).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CATALOG = path.join(__dirname, '..', 'src', 'lib', 'kdramas.json')
const CAND = path.join(__dirname, '..', 'src', 'lib', '_trailer-candidates.json')

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const CONCURRENCY = 5

function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
function toks(s) {
  return norm(s).split(' ').filter(Boolean)
}
function overlap(a, b) {
  if (!a.length || !b.length) return 0
  const set = new Set(a)
  const common = b.filter((t) => set.has(t)).length
  return common / Math.min(a.length, b.length)
}

async function oembedTitle(id) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      if (res.ok) return (await res.json()).title || ''
    } catch (e) { /* retry */ }
    await delay(500 * (attempt + 1))
  }
  return ''
}

const kdramas = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
const cand = fs.existsSync(CAND) ? JSON.parse(fs.readFileSync(CAND, 'utf8')) : {}
const targets = kdramas
  .filter((k) => !k.trailerYouTubeId && cand[k.slug])
  .map((k) => ({ entry: k, list: cand[k.slug] }))

let idx = 0
let applied = 0
let skipped = 0

const STARWORDS = ['official', 'official trailer', 'main trailer', 'teaser', 'trailer']

async function worker() {
  while (idx < targets.length) {
    const { entry: k, list } = targets[idx++]
    const titleTok = toks(k.title)
    let chosen = ''
    for (const c of list) {
      const vidTitle = await oembedTitle(c.id)
      if (!vidTitle) continue
      const vt = norm(vidTitle)
      const words = vt.split(' ')
      const isTrailer = words.some((w) =>
        /trailer|teaser/.test(w) && w.length > 3
      )
      const tok = toks(vidTitle)
      let ov
      if (titleTok.length === 1) {
        ov = tok[0] && tok[0] === titleTok[0] && isTrailer && tok.length <= 4 ? 1 : 0
      } else {
        ov = overlap(titleTok, tok)
      }
      // Require high overlap and a trailer/teaser mention.
      if (isTrailer && ov >= 0.55) {
        chosen = c.id
        break
      }
    }
    if (chosen) {
      k.trailerYouTubeId = chosen
      applied++
      console.log(`APPLY ${k.slug} -> ${chosen}`)
    } else {
      skipped++
      console.log(`SKIP ${k.slug}`)
    }
    if (applied % 20 === 0) fs.writeFileSync(CATALOG, JSON.stringify(kdramas, null, 2) + '\n')
    await delay(120)
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))
fs.writeFileSync(CATALOG, JSON.stringify(kdramas, null, 2) + '\n')
console.log(`\nDone. applied ${applied}, skipped ${skipped}, total candidates ${targets.length}`)