import { parseCues, buildVtt } from './subtitles-format.js'
import {
  subtisSearchTitles,
  subtisListSubtitles,
  subtisDownloadUrl,
  pickTitleMatch,
} from './subtis.js'

const API = 'https://api.translateapi.ai/api/v1'
const TARGET = 'mn'
const BATCH_SIZE = 100
const UA = 'VXNTA v1.0'

const GOOGLE_GROUP_LINES = 40
const GOOGLE_GROUP_CHARS = 1300
const GOOGLE_CONCURRENCY = 8
const NEWLINE_HOLDER = '\uE000'

function translateKey(key) {
  return key.replace(/\n/g, NEWLINE_HOLDER)
}

function restoreKey(value) {
  return value.replaceAll(NEWLINE_HOLDER, '\n')
}

function groupByPayload(keys) {
  const groups = []
  let current = []
  let chars = 0
  for (const key of keys) {
    const holder = translateKey(key)
    if (current.length >= GOOGLE_GROUP_LINES || chars + holder.length > GOOGLE_GROUP_CHARS) {
      if (current.length) {
        groups.push(current)
        current = []
        chars = 0
      }
    }
    current.push(holder)
    chars += holder.length
  }
  if (current.length) groups.push(current)
  return groups
}

async function translateGroup(group) {
  const q = group.join('\n')
  let payload
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=en&tl=${TARGET}&dt=t&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`Google translate failed (${res.status})`)
    payload = await res.json()
  } catch {
    return null
  }

  const segments = (payload?.[0] || [])
    .map((x) => (Array.isArray(x) && typeof x[0] === 'string' ? x[0] : ''))
    .join('')

  const parts = segments.split('\n')
  if (parts.length !== group.length) return null

  return parts.map((p, i) => {
    const out = restoreKey(p)
    return out || group[i]
  })
}

export async function translateLinesToMongolian(apiKey, lines) {
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
  let translatedCount = 0
  const groups = groupByPayload(uniqueLines)
  let cursor = 0

  async function worker() {
    while (cursor < groups.length) {
      const group = groups[cursor++]
      let outs = await translateGroup(group)
      if (!outs) {
        outs = []
        for (const item of group) {
          const single = await googleTranslateLine(restoreKey(item))
          outs.push(single || item)
        }
      }
      for (let j = 0; j < group.length; j++) {
        const key = restoreKey(group[j])
        const out = outs[j]
        for (const idx of dedupeMap.get(key)) translated[idx] = restoreKey(out) || key
        if (out && out !== group[j]) translatedCount++
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(GOOGLE_CONCURRENCY, groups.length) }, worker)
  )

  lines.forEach((_line, i) => {
    if (translated[i] === null) translated[i] = lines[i]
  })

  return {
    translated,
    translatedUnique: translatedCount,
    googleTranslated: 0,
    totalUnique: uniqueLines.length,
    quotaHit: false,
  }
}

async function googleTranslateLine(text, target = TARGET, source = 'auto') {
  const q = encodeURIComponent(text.slice(0, 400))
  const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=${source}&tl=${target}&dt=t&q=${q}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Google translate failed (${res.status})`)
  const payload = await res.json()
  const chunks = (payload?.[0] || [])
    .map((x) => (Array.isArray(x) && typeof x[0] === 'string' ? x[0] : ''))
    .join('')
  return chunks
}

export async function resolveSubtisSource({ title, year, type, season, episode }) {
  const candidates = await subtisSearchTitles(title)
  const match = pickTitleMatch(candidates, { title, year, type })
  if (!match) throw new Error('No matching title found on Subt.is')

  const data = await subtisListSubtitles(match.slug)
  let subs = data.results || []

  const isTV = type === 'episode' || type === 'tv' || type === 'series'
  if (isTV && season && episode) {
    subs = subs.filter(
      (e) =>
        e.subtitle &&
        Number(e.subtitle.current_season) === Number(season) &&
        Number(e.subtitle.current_episode) === Number(episode)
    )
  }

  const withText = subs.filter((e) => e.subtitle?.preview?.length)
  const entry = (withText[0] || subs[0])?.subtitle
  if (!entry) throw new Error('No subtitles found for this title on Subt.is')

  const finalUrl = await subtisDownloadUrl(entry.id)
  const res = await fetch(finalUrl, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Could not download source subtitle (${res.status})`)
  return res.text()
}

export async function fetchRemoteSubtitle(subFileUrl) {
  const res = await fetch(subFileUrl, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Could not download subtitle (${res.status})`)
  return res.text()
}

export { parseCues, buildVtt }