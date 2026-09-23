// scripts/batch-mn-subs.mjs — keyless batch Mongolian subtitle pre-generator.
//
// Source: subt.is (no key). Translation: free Google endpoint (no key).
// Usage:
//   node scripts/batch-mn-subs.mjs --only=the-odyssey,spider-man-brand-new-day
//   node scripts/batch-mn-subs.mjs --category=upcoming --limit=30
//   node scripts/batch-mn-subs.mjs --category=popular --limit=50 --force
//   node scripts/batch-mn-subs.mjs --all --limit=100 --delay=3000
//
// Writes data/subtitles/{slug}.vtt + manifest.json (same shape as the app).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  translateLinesToMongolian, parseCues, buildVtt,
} from '../src/lib/translate.js'
import {
  subtisSearchTitles, subtisListSubtitles, subtisDownloadUrl,
  pickTitleMatch, guessLanguage,
} from '../src/lib/subtis.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data', 'subtitles')
const MANIFEST = path.join(DATA_DIR, 'manifest.json')
const UA = 'VXNTA v1.0'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function fetchTimeout(url, opts = {}, ms = 25000) {
  return fetch(url, { ...opts, signal: opts.signal || AbortSignal.timeout(ms) })
}
const readJSON = (p, fb) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fb } }
const readManifest = () => readJSON(MANIFEST, {})
function writeManifest(m) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2))
}
function saveGenerated(slug, content, meta) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const m = readManifest()
  if (!content) {
    m[slug] = { ...meta, updatedAt: Date.now() }
    writeManifest(m)
    return
  }
  fs.writeFileSync(path.join(DATA_DIR, `${slug}.vtt`), content)
  m[slug] = { file: `${slug}.vtt`, ...meta, updatedAt: Date.now() }
  writeManifest(m)
}

// ---- movie list: generated + hardcoded (union by slug) ----
function loadMovies() {
  const gen = readJSON(path.join(ROOT, 'src', 'lib', 'movies.generated.json'), [])
  const list = Array.isArray(gen) ? gen : gen.movies || []
  const out = new Map()
  for (const m of list) {
    if (!m?.slug) continue
    out.set(m.slug, { slug: m.slug, title: m.title, year: m.year, category: m.category })
  }
  // hardcoded popularFallbackMovies in movies.js
  const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'movies.js'), 'utf8')
  const blocks = src.match(/\{[^{}]*slug:\s*'[^']+'[^{}]*\}/g) || []
  for (const b of blocks) {
    const slug = b.match(/slug:\s*'([^']+)'/)?.[1]
    const title = b.match(/title:\s*'([^']+)'/)?.[1]
    const year = Number(b.match(/year:\s*(\d{4})/)?.[1] || 0)
    const category = b.match(/category:\s*'([^']+)'/)?.[1]
    if (slug && title && !out.has(slug)) out.set(slug, { slug, title, year, category })
  }
  return [...out.values()]
}

function cyrillicRatio(text) {
  if (!text) return 0
  const cyr = (text.match(/[\u0400-\u04FF]/g) || []).length
  const letters = (text.match(/[A-Za-z\u0400-\u04FF]/g) || []).length
  return letters ? cyr / letters : 0
}

function queryVariants(title) {
  const out = [title]
  const noArticle = title.replace(/^(the|a|an)\s+/i, '').trim()
  if (noArticle && noArticle !== title) out.push(noArticle)
  const words = noArticle.split(/\s+/).filter((w) => w.length > 2 && !/^(part|volume|vol)$/i.test(w))
  if (words.length >= 2) out.push(words.slice(0, 3).join(' '))
  if (words.length >= 1) out.push(words[0])
  return [...new Set(out)]
}

async function processOne(movie) {
  const { slug, title, year } = movie
  // 1. search title (with fallbacks)
  let candidates = []
  let searchErr = null
  for (const q of queryVariants(title)) {
    try {
      candidates = await subtisSearchTitles(q)
      if (candidates?.length) break
    } catch (e) {
      searchErr = e
      await sleep(800)
    }
  }
  if (!candidates?.length) {
    return { status: 'no-source', detail: 'search failed: ' + (searchErr?.message || 'no match') }
  }
  const match = pickTitleMatch(candidates, { title, year, type: 'movie' })
  if (!match) return { status: 'no-source', detail: 'no title match' }
  // 2. list subtitles
  let data
  try {
    data = await subtisListSubtitles(match.slug)
  } catch (e) {
    return { status: 'no-source', detail: 'list failed: ' + e.message }
  }
  const subs = (data.results || []).map((e) => e.subtitle).filter(Boolean)
  if (!subs.length) return { status: 'no-source', detail: 'empty list' }
  // 3. prefer Mongolian, else English / first with preview
  const entry = pickBestEntry(subs).entry
  return processEntry(slug, entry)
}

function pickBestEntry(subs) {
  const scored = subs.map((s) => {
    const g = guessLanguage(s.file_name || s.filename || s.name || '', s.preview || [])
    return { s, lang: g.code }
  })
  const mnEntry = scored.find((x) => x.lang === 'mon')
  const enEntry = scored.find((x) => x.lang === 'eng')
  const withPreview = scored.find((x) => (x.s.preview || []).length)
  const entry = (mnEntry || enEntry || withPreview || scored[0]).s
  return { entry, isMnHint: !!mnEntry }
}

async function processEntry(slug, entry, meta = {}) {
  // 4. download
  let content
  try {
    const url = await subtisDownloadUrl(entry.id)
    const res = await fetchTimeout(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error('download ' + res.status)
    content = await res.text()
  } catch (e) {
    return { status: 'error', detail: 'download failed: ' + e.message }
  }
  const cues = parseCues(content)
  if (!cues.length) return { status: 'error', detail: 'empty cues' }
  // 5. native MN? (filename said so, or content is Cyrillic)
  const sampleText = cues.slice(0, 60).map((c) => c.text).join('\n')
  const g = guessLanguage(entry.file_name || entry.filename || entry.name || '', entry.preview || [])
  if (g.code === 'mon' || cyrillicRatio(sampleText) > 0.3) {
    const vtt = buildVtt(cues)
    saveGenerated(slug, vtt, {
      source: 'subtis', language: 'mn', generated: true, translated: true,
      partial: false, cueCount: cues.length, sourceDetail: 'Subt.is (native Mongolian)', ...meta,
    })
    return { status: 'native', detail: cues.length + ' cues' }
  }
  // 6. translate EN -> MN (Google, keyless)
  const lines = cues.map((c) => c.text)
  let tr
  try {
    tr = await translateLinesToMongolian(null, lines)
  } catch (e) {
    return { status: 'error', detail: 'translate failed: ' + e.message }
  }
  const outCues = cues.map((c, i) => ({ ...c, text: tr.translated[i] || c.text }))
  const vtt = buildVtt(outCues)
  const ratio = tr.totalUnique ? tr.translatedUnique / tr.totalUnique : 1
  saveGenerated(slug, vtt, {
    source: 'subtis', language: 'en', generated: true, translated: true,
    partial: ratio < 0.9, translatedLineRatio: ratio, cueCount: cues.length,
    sourceDetail: `Subt.is EN → MN (google, ${(ratio * 100).toFixed(0)}%)`, ...meta,
  })
  return { status: ratio < 0.9 ? 'partial' : 'translated', detail: `${cues.length} cues (${(ratio * 100).toFixed(0)}%)` }
}

const pad2 = (n) => String(n).padStart(2, '0')

async function processSeries(show, delay) {
  // search + list once, then process every available S/E pair
  let candidates = []
  for (const q of queryVariants(show.title)) {
    try {
      candidates = await subtisSearchTitles(q)
      if (candidates?.length) break
    } catch { await sleep(800) }
  }
  if (!candidates?.length) return [{ status: 'no-source', detail: 'no title match' }]
  const match = pickTitleMatch(candidates, { title: show.title, year: show.year, type: 'series' })
  if (!match) return [{ status: 'no-source', detail: 'no title match' }]
  let data
  try {
    data = await subtisListSubtitles(match.slug)
  } catch (e) {
    return [{ status: 'no-source', detail: 'list failed' }]
  }
  const subs = (data.results || []).map((e) => e.subtitle).filter(Boolean)
  // group by season/episode
  const groups = new Map()
  for (const s of subs) {
    const se = Number(s.current_season ?? s.season ?? 1)
    const ep = Number(s.current_episode ?? s.episode ?? 0)
    if (!ep) continue
    const key = `${se}x${ep}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  }
  if (!groups.size) return [{ status: 'no-source', detail: 'no episodes listed' }]
  const manifest = readManifest()
  const results = []
  const keys = [...groups.keys()].sort()
  for (const key of keys) {
    const [se, ep] = key.split('x').map(Number)
    const slug = `${show.slug}-S${pad2(se)}E${pad2(ep)}`
    const existing = manifest[slug]
    if (existing?.file && existing.translated && !existing.partial) {
      try {
        if (fs.existsSync(path.join(DATA_DIR, existing.file))) {
          results.push({ status: 'done', detail: slug })
          continue
        }
      } catch {}
    }
    const { entry } = pickBestEntry(groups.get(key))
    try {
      const res = await processEntry(slug, entry, { series: show.slug, season: se, episode: ep })
      results.push({ ...res, detail: `${slug} ${res.detail || ''}` })
    } catch (e) {
      results.push({ status: 'error', detail: `${slug} ${String(e.message || e).slice(0, 80)}` })
    }
    await sleep(delay)
  }
  return results
}

async function main() {
  const args = process.argv.slice(2)
  const get = (k) => args.find((a) => a.startsWith(k + '='))?.split('=').slice(1).join('=')
  const only = (get('--only') || '').split(',').map((s) => s.trim()).filter(Boolean)
  const category = get('--category')
  const series = get('--series') // kdramas|western|all
  const limit = Number(get('--limit') || 0)
  const delay = Number(get('--delay') || 2000)
  const force = args.includes('--force')
  const all = args.includes('--all')

  if (series) {
    const kd = readJSON(path.join(ROOT, 'src', 'lib', 'kdramas.json'), [])
    const w = readJSON(path.join(ROOT, 'src', 'lib', 'western.json'), [])
    let shows = series === 'kdramas' ? kd : series === 'western' ? w : [...kd, ...w]
    shows = shows.filter((s) => s?.slug && s?.title)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    if (only.length) shows = shows.filter((s) => only.includes(s.slug))
    const todo = limit ? shows.slice(0, limit) : shows
    console.log(`Series todo: ${todo.length} (force=${force})`)
    const stats = { native: 0, translated: 0, partial: 0, 'no-source': 0, error: 0, done: 0 }
    for (let i = 0; i < todo.length; i++) {
      const s = todo[i]
      const tag = `[${i + 1}/${todo.length}]`
      try {
        const results = await processSeries(s, delay)
        const done = results.filter((r) => ['native', 'translated', 'partial', 'done'].includes(r.status)).length
        for (const r of results) stats[r.status] = (stats[r.status] || 0) + 1
        console.log(`${tag} ${s.slug} eps:${results.length} done:${done} ${results[0]?.status === 'no-source' ? results[0].detail : ''}`)
      } catch (e) {
        stats.error++
        console.log(`${tag} ${s.slug} error ${String(e.message || e).slice(0, 100)}`)
      }
      if (i < todo.length - 1) await sleep(delay)
    }
    console.log('\n=== SERIES SUMMARY ===')
    console.log(JSON.stringify(stats, null, 2))
    console.log('Manifest entries:', Object.keys(readManifest()).length)
    return
  }

  let movies = loadMovies()
  console.log(`Catalog movies: ${movies.length}`)
  if (only.length) movies = movies.filter((m) => only.includes(m.slug))
  else if (category) movies = movies.filter((m) => m.category === category)
  else if (!all) {
    console.error('Pass --only=.. or --category=.. or --all')
    process.exit(1)
  }
  const manifest = readManifest()
  if (!force) {
    movies = movies.filter((m) => {
      const e = manifest[m.slug]
      if (!e) return true
      if (e.file) {
        try {
          if (fs.existsSync(path.join(DATA_DIR, e.file)) && e.translated && !e.partial) return false
        } catch {}
      }
      if (e.source === 'none' && e.generated) return false // checked before, no source
      return true
    })
  }
  const todo = limit ? movies.slice(0, limit) : movies
  console.log(`Todo: ${todo.length} (force=${force})`)

  const stats = { native: 0, translated: 0, partial: 0, 'no-source': 0, error: 0 }
  for (let i = 0; i < todo.length; i++) {
    const m = todo[i]
    const tag = `[${i + 1}/${todo.length}]`
    try {
      const res = await processOne(m)
      stats[res.status] = (stats[res.status] || 0) + 1
      console.log(`${tag} ${m.slug} ${res.status} ${res.detail || ''}`)
    } catch (e) {
      stats.error++
      console.log(`${tag} ${m.slug} error ${String(e.message || e).slice(0, 100)}`)
    }
    if (i < todo.length - 1) await sleep(delay)
  }
  console.log('\n=== SUMMARY ===')
  console.log(JSON.stringify(stats, null, 2))
  console.log('Manifest entries:', Object.keys(readManifest()).length)
}

main()
