import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data', 'subtitles')
const MANIFEST = path.join(DATA_DIR, 'manifest.json')

const TARGET = 'mn'
const BATCH_SIZE = 100
const FETCH_TIMEOUT = 20000

function timeoutFetch(url, opts = {}) {
  return fetch(url, { ...opts, signal: opts.signal || AbortSignal.timeout(FETCH_TIMEOUT) })
}

function loadEnv() {
  const out = {}
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
  for (const k of Object.keys(process.env)) {
    if (k.startsWith('OPENSUBTITLES_') || k.startsWith('TRANSLATEAPI_')) out[k] = process.env[k]
  }
  return out
}

function readJSON(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return fallback
  }
}

function readManifest() {
  return readJSON(MANIFEST, {})
}

function saveGenerated(slug, content, meta) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const m = readManifest()
  if (!content) {
    m[slug] = { ...meta, updatedAt: Date.now() }
    fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2))
    return
  }
  const file = `${slug}.vtt`
  fs.writeFileSync(path.join(DATA_DIR, file), content)
  m[slug] = { file, ...meta, updatedAt: Date.now() }
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2))
}

function parseCues(content) {
  let text = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim()
  if (text.startsWith('WEBVTT')) {
    text = text
      .replace(/^WEBVTT.*$/i, '')
      .replace(/^STYLE[\s\S]*?^$/gm, '')
      .replace(/^NOTE[\s\S]*?^$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  const cues = []
  for (const block of blocks) {
    const lines = block.split('\n')
    const timeIdx = lines.findIndex((l) => /-->/.test(l))
    if (timeIdx === -1) continue
    const id = timeIdx === 0 ? '' : lines[timeIdx - 1].trim()
    const timing = lines[timeIdx].trim()
    const cueText = lines.slice(timeIdx + 1).join('\n').trim()
    if (!cueText || !timing) continue
    cues.push({ id, timing, text: cueText })
  }
  return cues
}

function buildVtt(cues) {
  return [
    'WEBVTT',
    '',
    ...cues.map((c, i) => {
      const timing = c.timing.replace(/,(\d{3})/g, '.$1')
      const id = c.id || String(i + 1)
      return `${id}\n${timing}\n${c.text}`
    }),
    '',
  ].join('\n')
}

async function subtisSearchTitles(query) {
  const res = await timeoutFetch(`https://api.subt.is/v1/titles/search/${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'VXNTA/1.0', Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Subt.is search 404')
  return (await res.json()).results || []
}

async function subtisListSubtitles(slug) {
  const res = await timeoutFetch(`https://api.subt.is/v1/subtitles/movie/${slug}`, {
    headers: { 'User-Agent': 'VXNTA/1.0', Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Subt.is list 404')
  return res.json()
}

async function subtisDownloadUrl(subId) {
  const res = await timeoutFetch(`https://api.subt.is/v1/subtitle/link/${subId}`, {
    headers: { 'User-Agent': 'VXNTA/1.0' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`Subt.is link failed ${res.status}`)
  return res.url
}

function pickTitleMatch(candidates, { title, year, type }) {
  if (!candidates.length) return null
  const lower = (title || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const scored = candidates
    .map((c) => {
      let score = 0
      const slug = c.slug || ''
      if (type === 'series') {
        if (['series', 'tv', 'show'].includes(c.type)) score += 3
        if (c.type === 'movie') score -= 3
      }
      if (year && String(c.year) === String(year)) score += 2
      if (lower && slug.replace(/[^a-z0-9]/g, '').startsWith(lower)) score += 2
      if (lower && slug.replace(/[^a-z0-9]/g, '').includes(lower)) score += 1
      return { c, score }
    })
    .sort((a, b) => b.score - a.score)
  return scored[0].score > 0 ? scored[0].c : candidates[0]
}

function osHeaders(osKey, token, lang = 'en') {
  return {
    Accept: '*/*',
    'Api-Key': osKey,
    'User-Agent': 'VXNTA v1.0',
    'Accept-Language': lang,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function osLogin(osBase, osKey, username, password) {
  const res = await timeoutFetch(`${osBase}/login`, {
    method: 'POST',
    headers: { ...(await osHeaders(osKey)), 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error(`OS login failed ${res.status}`)
  const data = await res.json()
  if (!data.token) throw new Error('OS login returned no token')
  return data.token
}

async function osSearch(osBase, osKey, params, token) {
  const qs = new URLSearchParams(params).toString()
  const res = await timeoutFetch(`${osBase}/subtitles?${qs}`, {
    headers: await osHeaders(osKey, token),
  })
  if (!res.ok) return []
  return (await res.json()).data || []
}

async function osDownload(osBase, osKey, fileId, token) {
  const res = await timeoutFetch(`${osBase}/download`, {
    method: 'POST',
    headers: { ...(await osHeaders(osKey, token)), 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId, sub_format: 'srt' }),
  })
  if (!res.ok) throw new Error(`OS download failed ${res.status}`)
  const data = await res.json()
  const link = data.link
  if (!link) throw new Error(`OS download returned no link: ${JSON.stringify(data).slice(0, 200)}`)
  const dl = await timeoutFetch(link, { headers: { 'User-Agent': 'VXNTA v1.0' } })
  if (!dl.ok) throw new Error(`OS file fetch failed ${dl.status}`)
  return dl.text()
}

async function osAiTranslate(osBase, osKey, token, srtContent, translateTo = 'mn', api = 'deepl2') {
  const qs = new URLSearchParams({ api, translate_from: 'en', translate_to: translateTo, file: srtContent })
  const res = await timeoutFetch(`${osBase}/ai/translate?${qs}`, {
    method: 'POST',
    headers: { ...(await osHeaders(osKey, token)), 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) throw new Error((data.message || `OS AI translate failed ${res.status}`) + ` | api=${api}`)
  const correlationId = data.correlation_id
  if (!correlationId) throw new Error(`OS AI translate: no correlation_id (${JSON.stringify(data).slice(0, 120)})`)

  for (let i = 0; i < 120; i++) {
    const s = await timeoutFetch(`${osBase}/ai/translate/${correlationId}`, {
      headers: await osHeaders(osKey, token),
    })
    const sj = await s.json()
    if (sj.status === 'COMPLETED') {
      const url = sj.data?.url
      if (!url) throw new Error('OS AI translate completed but no file url')
      const f = await timeoutFetch(url, { headers: { 'User-Agent': 'VXNTA v1.0' } })
      if (!f.ok) throw new Error(`OS AI translated file fetch failed ${f.status}`)
      return {
        content: await f.text(),
        api,
        characters: sj.data.characters_count,
        creditsLeft: sj.data.credits_left,
      }
    }
    if (/FAILED|ERROR/i.test(sj.status || '')) throw new Error(sj.message || `OS AI translate failed (${sj.status})`)
    await sleep(3000)
  }
  throw new Error('OS AI translate timed out')
}

async function translateSourceToMongolian({ srt, apiKey, osBase, osKey, osToken }) {
  if (osKey && osToken) {
    const attempts = [
      { api: 'deepl2' },
      { api: 'aws' },
    ]
    let lastErr = null
    for (const { api } of attempts) {
      try {
        return await osAiTranslate(osBase, osKey, osToken, srt, 'mn', api)
      } catch (err) {
        lastErr = err
      }
    }
    if (lastErr && !/language|supported|not.*support|error/i.test(lastErr.message || '')) {
      throw lastErr
    }
  }

  const sourceCues = parseCues(srt)
  const lines = sourceCues.map((c) => c.text)
  const { translated, translatedUnique, totalUnique, quotaHit } = await translateLinesToMongolian(apiKey, lines)
  if (quotaHit && translatedUnique === 0 && googleTranslated === 0) throw new Error('TranslateAPI daily limit reached')
  const vtt = buildVtt(sourceCues.map((c, i) => ({ ...c, text: translated[i] })))
  return { content: vtt, provider: 'translateapi', partial: quotaHit, ratio: totalUnique ? translatedUnique / totalUnique : 1 }
}

async function resolveOpenSubtitles({ tmdbId, osKey, osToken, osBase }) {
  if (!tmdbId || !osKey) return null

  const mn = await osSearch(osBase, osKey, { tmdb_id: tmdbId, languages: 'mn' }, osToken)
  if (mn.length) {
    const file = mn[0].attributes?.files?.[0]
    if (file && file.file_id != null) {
      return { content: await osDownload(osBase, osKey, file.file_id, osToken), language: 'mn' }
    }
  }

  const en = await osSearch(osBase, osKey, { tmdb_id: tmdbId, languages: 'en' }, osToken)
  if (en.length) {
    const file = en[0].attributes?.files?.[0]
    if (file && file.file_id != null) {
      return { content: await osDownload(osBase, osKey, file.file_id, osToken), language: 'en' }
    }
  }

  return null
}

async function resolveSource(movie, osKey, osToken, osBase) {
  const viaOs = await resolveOpenSubtitles({ tmdbId: movie.tmdbId, osKey, osToken, osBase })
  if (viaOs) return viaOs
  const content = await resolveSubtisSource({
    title: movie.title,
    year: movie.year,
    type: Number(movie.episodes) > 1 ? 'series' : 'movie',
  })
  return { content, language: 'subtis' }
}

async function resolveSubtisSource({ title, year, type }) {
  const candidates = await subtisSearchTitles(title)
  const match = pickTitleMatch(candidates, { title, year, type })
  if (!match) throw new Error('No matching title found on Subt.is')

  const data = await subtisListSubtitles(match.slug)
  const subs = data.results || []
  const withText = subs.filter((e) => e.subtitle?.preview?.length)
  const entry = (withText[0] || subs[0])?.subtitle
  if (!entry) throw new Error('No subtitles found for this title on Subt.is')

  const finalUrl = await subtisDownloadUrl(entry.id)
  const res = await timeoutFetch(finalUrl, { headers: { 'User-Agent': 'VXNTA/1.0' } })
  if (!res.ok) throw new Error(`Could not download source subtitle ${res.status}`)
  return res.text()
}

async function submitBatch(apiKey, texts) {
  const res = await timeoutFetch('https://api.translateapi.ai/api/v1/translate/batch/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ texts, target_language: TARGET, source_language: 'auto' }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Batch submit failed (${res.status})`)
  }
  return res.json()
}

async function pollJob(apiKey, jobId) {
  for (let i = 0; i < 150; i++) {
    const res = await timeoutFetch(`https://api.translateapi.ai/api/v1/jobs/${jobId}/`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error(`Poll failed ${res.status}`)
    const data = await res.json()
    if (data.status === 'completed') return data.result_data
    if (data.status === 'failed') throw new Error(data.error_message || 'job failed')
    await new Promise((r) => setTimeout(r, 3000))
  }
  throw new Error('Translation timed out')
}

async function translateLinesToMongolian(apiKey, lines) {
  const translated = new Array(lines.length).fill(null)
  const dedupeMap = new Map()
  lines.forEach((line, i) => {
    const key = line.trim()
    if (!key) return
    if (/[\u0400-\u04FF]/.test(key)) return
    if (!dedupeMap.has(key)) dedupeMap.set(key, [])
    dedupeMap.get(key).push(i)
  })
  const uniqueLines = [...dedupeMap.keys()]
  let translatedUnique = 0
  let quotaHit = false

  for (let i = 0; i < uniqueLines.length; i += BATCH_SIZE) {
    const texts = uniqueLines.slice(i, i + BATCH_SIZE)
    let submitted
    try {
      submitted = await submitBatch(apiKey, texts)
    } catch (err) {
      if (/limit|quota|insufficient|exceeded/i.test(err.message || '')) {
        quotaHit = true
        break
      }
      throw err
    }
    const { translations } = await pollJob(apiKey, submitted.job_id)
    for (let j = 0; j < texts.length; j++) {
      const out = translations?.[j] ?? texts[j]
      for (const idx of dedupeMap.get(texts[j])) translated[idx] = out
    }
    translatedUnique += texts.length
  }

  const translatedKeys = new Set(
    uniqueLines.filter((key) => {
      const i = dedupeMap.get(key)?.[0]
      const out = i == null ? null : translated[i]
      return out != null && out !== key
    })
  )
  let googleTranslated = 0
  const googleTargets = uniqueLines.filter((key) => !translatedKeys.has(key) && ![\u0400-\u04FF].test(key) && !/^[\d\s]*$/.test(key))
  const CONCURRENCY = 12
  let cursor = 0
  async function googleWorker() {
    while (cursor < googleTargets.length) {
      const key = googleTargets[cursor++]
      try {
        const out = await googleTranslateLineMongolian(key)
        if (out && out !== key) {
          for (const idx of dedupeMap.get(key)) translated[idx] = out
          googleTranslated++
        }
      } catch {
        /* keep original line on fallback failure */
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, googleTargets.length) }, googleWorker))

  lines.forEach((_l, i) => {
    if (translated[i] === null) translated[i] = lines[i]
  })
  return { translated, translatedUnique, totalUnique: uniqueLines.length, quotaHit, googleTranslated }
}

async function googleTranslateLineMongolian(text) {
  const q = encodeURIComponent(text.slice(0, 400))
  const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=en&tl=mn&dt=t&q=${q}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Google translate failed (${res.status})`)
  const payload = await res.json()
  const chunks = (payload?.[0] || [])
    .map((x) => (Array.isArray(x) && typeof x[0] === 'string' ? x[0] : ''))
    .join('')
  return chunks
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function processOne(movie, apiKey, osBase, osKey, osToken, manifest, force) {
  const { slug, title, year } = movie
  const existing = manifest[slug]

  if (existing && !force && existing.translated === true && !existing.partial) return { status: 'done' }
  if (existing && !force && existing.source === 'none' && existing.generated) return { status: 'no-source' }

  try {
    let source
    try {
      source = await resolveSource(movie, osKey, osToken, osBase)
    } catch (err) {
      saveGenerated(slug, '', {
        source: 'none',
        generated: true,
        error: String(err.message || err).slice(0, 120),
      })
      return { status: 'no-source', detail: err.message }
    }

    const cues = parseCues(source.content)
    if (!cues.length) throw new Error('empty cues')

    // Native Mongolian from OpenSubtitles — no translation needed.
    if (source.language === 'mn') {
      const vtt = buildVtt(cues)
      saveGenerated(slug, vtt, {
        source: 'opensubtitles',
        language: 'mn',
        generated: true,
        translated: true,
        partial: false,
        cueCount: cues.length,
        sourceDetail: 'OpenSubtitles (native Mongolian)',
      })
      return { status: 'native', detail: `${cues.length} cues` }
    }

    let result
    try {
      result = await translateSourceToMongolian({
        srt: source.content,
        apiKey,
        osBase,
        osKey,
        osToken,
      })
    } catch (err) {
      if (/daily limit/i.test(err.message || '')) return { status: 'quota', detail: 'daily limit reached' }
      throw err
    }

    const vtt = result.content
    const sourceIsOs = source.language === 'en'
    const provider = result.provider || 'opensubtitles-ai'
    saveGenerated(slug, vtt, {
      source: sourceIsOs ? 'opensubtitles' : 'subtis',
      language: source.language,
      generated: true,
      translated: true,
      partial: !!result.partial,
      provider: result.api || provider,
      translatedLineRatio: result.ratio ?? 1,
      cueCount: cues.length,
      sourceDetail: `${sourceIsOs ? 'OpenSubtitles' : 'Subt.is'} → MN (${result.api || provider})`,
    })
    return { status: result.partial ? 'partial' : 'translated', detail: `${cues.length} cues (${result.api || provider})` }
  } catch (err) {
    saveGenerated(slug, '', {
      generated: true,
      error: String(err.message || err).slice(0, 120),
    })
    return { status: 'error', detail: String(err.message || err).slice(0, 120) }
  }
}

const CONCURRENCY = 3
async function pool(items, worker) {
  const results = new Array(items.length)
  let next = 0
  const run = async () => {
    while (next < items.length) {
      const idx = next++
      results[idx] = await worker(items[idx], idx)
      await sleep(150)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run))
  return results
}

async function scanCoverage(movies, osBase, osKey, osToken) {
  let covered = 0
  let viaMn = 0
  let viaEn = 0
  const coveredBy = {}
  console.log(`Scanning source coverage + sizing across ${movies.length} titles...`)
  const results = await pool(movies, async (movie) => {
    try {
      const viaOs = await resolveOpenSubtitles({ tmdbId: movie.tmdbId, osKey, osToken, osBase })
      if (viaOs) {
        if (viaOs.language === 'mn') viaMn++
        else viaEn++
        covered++
        const cues = parseCues(viaOs.content)
        return { via: `os:${viaOs.language}`, cues: cues.length, chars: cues.reduce((n, c) => n + c.text.length, 0) }
      }
      const candidates = await subtisSearchTitles(movie.title)
      const match = pickTitleMatch(candidates, {
        title: movie.title,
        year: movie.year,
        type: Number(movie.episodes) > 1 ? 'series' : 'movie',
      })
      if (match) {
        const data = await subtisListSubtitles(match.slug)
        const entry = (data.results?.filter((e) => e.subtitle?.preview?.length)[0] || data.results?.[0])?.subtitle
        if (entry) {
          const finalUrl = await subtisDownloadUrl(entry.id)
          const res = await timeoutFetch(finalUrl, { headers: { 'User-Agent': 'VXNTA/1.0' } })
          if (res.ok) {
            const cues = parseCues(await res.text())
            covered++
            return { via: 'subtis', cues: cues.length, chars: cues.reduce((n, c) => n + c.text.length, 0) }
          }
        }
      }
    } catch {}
    return null
  })
  results.forEach((r, i) => {
    if (r) {
      coveredBy[movies[i].slug] = r
      console.log(`  ${String(r.via).padEnd(12, ' ')} ${String(r.cues).padStart(5, ' ')} cues ${String(r.chars).padStart(7, ' ')} chars  ${movies[i].slug}`)
    }
  })
  console.log(`\nCoverage summary: ${covered}/${movies.length}
  via OpenSubtitles (needs key): ${viaMn + viaEn} (native mn: ${viaMn})
  via Subt.is (keyless): ${covered - viaMn - viaEn}`)
  await fs.promises.mkdir(DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(ROOT, 'data', 'subtitles', 'coverage.json'), JSON.stringify(coveredBy, null, 2))
}

async function main() {
  const env = loadEnv()
  const apiKey = env.TRANSLATEAPI_API_KEY
  const osKey = env.OPENSUBTITLES_API_KEY || ''
  const osBase = (env.OPENSUBTITLES_API_BASE || 'https://api.opensubtitles.com/api/v1').replace(/\/$/, '')
  const osUser = env.OPENSUBTITLES_USERNAME || ''
  const osPass = env.OPENSUBTITLES_PASSWORD || ''
  if (!apiKey) {
    console.error('TRANSLATEAPI_API_KEY not found in .env.local')
    process.exit(1)
  }

  let osToken = null
  if (osKey) {
    if (osUser && osPass) {
      try {
        osToken = await osLogin(osBase, osKey, osUser, osPass)
        console.log('OpenSubtitles: logged in (JWT ready)')
      } catch (err) {
        console.log(`OpenSubtitles login failed (${err.message}) — falling back to consumer-only downloads.`)
      }
    }
  }

  const posters = readJSON(path.join(ROOT, 'src', 'lib', 'kdrama-posters.json'), {})
  const movies = readJSON(path.join(ROOT, 'src', 'lib', 'kdramas.json'), []).map((m) => ({
    ...m,
    tmdbId: m.tmdbId || (posters[m.slug]?.tmdbId ?? null),
  }))
  const manifest = readManifest()
  const force = process.argv.includes('--force')
  const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0)

  if (process.argv.includes('--scan')) {
    const known = Object.keys(readJSON(path.join(ROOT, 'data', 'subtitles', 'coverage.json'), {}))
    const scanTargets = limit
      ? movies.slice(0, limit)
      : known.length
        ? movies.filter((m) => known.includes(m.slug))
        : movies
    await scanCoverage(scanTargets, osBase, osKey, osToken)
    return
  }

  const todoBase = limit ? movies.slice(0, limit) : movies
  const coverage = readJSON(path.join(ROOT, 'data', 'subtitles', 'coverage.json'), {})
  const osCov = readJSON(path.join(ROOT, 'data', 'subtitles', 'os-coverage.json'), {})
  const osSlugs = new Set([
    ...(osCov.mn || []).map((x) => x.slug),
    ...(osCov.en || []).map((x) => x.slug),
  ])
  const todo = todoBase
    .filter((m) => force || coverage[m.slug] || osSlugs.has(m.slug))
    .sort((a, b) => (coverage[a.slug]?.chars ?? Infinity) - (coverage[b.slug]?.chars ?? Infinity))
  console.log(`Pre-generating Mongolian subtitles: ${todo.length} titles with an available source (smallest first, force=${force})`)
  console.log(`OpenSubtitles key: ${osKey ? 'present' : 'MISSING — OS source unavailable, only Subt.is'}`)
  console.log(`Existing manifest entries: ${Object.keys(manifest).length}`)
  const stats = { done: 0, native: 0, translated: 0, partial: 0, noSource: 0, quota: 0, error: 0 }
  let quotaStopped = false

  const results = []
  for (const movie of todo) {
    if (quotaStopped) break
    const res = await processOne(movie, apiKey, osBase, osKey, osToken, manifest, force)
    console.log(
      `[${new Date().toISOString().slice(11, 19)}] ${movie.slug.padEnd(42, ' ')} ${String(res.status).padEnd(10, ' ')} ${res.detail || ''}`
    )
    results.push(res)
    if (res.status === 'quota') quotaStopped = true
  }

  for (const r of results) {
    const statKey = { 'no-source': 'noSource' }[r.status] || r.status
    if (stats[statKey] !== undefined) stats[statKey]++
  }

  console.log('\n=== SUMMARY ===')
  console.log(JSON.stringify(stats, null, 2))
  if (quotaStopped) {
    console.log('Daily translation quota exhausted — rerun after the quota resets to continue.')
  }
}

await main()