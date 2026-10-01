// Audits every entry with a trailerYouTubeId: fetches the oEmbed title and keeps
// the ID only if the video title mentions a trailer/teaser AND shares >= threshold
// tokens with the drama title. Writes an audit log to /tmp/audit-report.txt.
import fs from 'fs'

const CONCURRENCY = 6
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}
function toks(s) { return norm(s).split(' ').filter(Boolean) }
function overlap(a, b) {
  if (!a.length || !b.length) return 0
  const set = new Set(a)
  return b.filter((t) => set.has(t)).length / Math.min(a.length, b.length)
}

async function oembedTitle(id) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      if (res.ok) return (await res.json()).title || ''
    } catch (e) { /* retry */ }
    await delay(400 * (attempt + 1))
  }
  return ''
}

const entries = JSON.parse(fs.readFileSync(process.argv[2] || '/tmp/audit.json', 'utf8'))
let idx = 0
const out = []

async function worker() {
  while (idx < entries.length) {
    const e = entries[idx++]
    const vt = await oembedTitle(e.id)
    if (!vt) {
      out.push({ slug: e.slug, status: 'DEAD', id: e.id })
      continue
    }
    const titleTok = toks(e.title)
    const vidTok = toks(vt)
    const isTrailer = vidTok.some((w) => w.length > 3 && /trailer|teaser/.test(w))
    let ov = titleTok.length === 1
      ? (vidTok[0] === titleTok[0] && isTrailer ? 1 : 0)
      : overlap(titleTok, vidTok)
    if (isTrailer && ov >= 0.6) out.push({ slug: e.slug, status: 'OK', id: e.id, ov: +ov.toFixed(2) })
    else out.push({ slug: e.slug, status: 'MISMATCH', id: e.id, ov: +ov.toFixed(2), title: vt.slice(0, 80) })
    if (out.length % 40 === 0) console.log(`...${out.length}`)
    await delay(120)
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))
out.sort((a, b) => (a.status === b.status ? 0 : a.status === 'OK' ? -1 : 1))
fs.writeFileSync('/tmp/audit-report.txt', out.map((r) => `${r.status}\t${r.slug}\t${r.id}\t${r.title || ''}`).join('\n'))
const okCount = out.filter((r) => r.status === 'OK').length
console.log(`OK=${okCount} MISMATCH=${out.filter((r) => r.status === 'MISMATCH').length} DEAD=${out.filter((r) => r.status === 'DEAD').length}`)