const BASE = 'https://api.subt.is/v1'
const UA = 'VXNTA/1.0'

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Subt.is request failed (${res.status})`)
  return res.json()
}

export async function subtisSearchTitles(query) {
  if (!query) throw new Error('Missing title')
  const data = await getJson(`/titles/search/${encodeURIComponent(query)}`)
  return data.results || []
}

export async function subtisListSubtitles(slug) {
  if (!slug) throw new Error('Missing slug')
  const data = await getJson(`/subtitles/movie/${slug}`)
  return data
}

export async function subtisDownloadUrl(subId) {
  const res = await fetch(`${BASE}/subtitle/link/${subId}`, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`Subt.is link failed (${res.status})`)
  return res.url
}

const LANGUAGE_HINTS = [
  { code: 'eng', label: 'English', tokens: ['en.srt', '.eng.', 'english', '-en', '_en'] },
  { code: 'spa', label: 'Spanish', tokens: ['es.srt', '.esp.', 'spanish', '-es', '_es', 'castellano'] },
  { code: 'por', label: 'Portuguese', tokens: ['pt.srt', '.por.', 'portuguese', '-pt', '_pt', 'portugues'] },
  { code: 'fre', label: 'French', tokens: ['fr.srt', '.fre.', 'french', '-fr', '_fr', 'francais', 'french'] },
  { code: 'ger', label: 'German', tokens: ['de.srt', '.ger.', 'german', '-de', '_de', 'deutsch'] },
  { code: 'ita', label: 'Italian', tokens: ['it.srt', '.ita.', 'italian', '-it', '_it', 'italiano'] },
  { code: 'mon', label: 'Mongolian', tokens: ['mn.srt', '.mon.', 'mongolian', '-mn', '_mn'] },
  { code: 'rus', label: 'Russian', tokens: ['ru.srt', '.rus.', 'russian', '-ru', '_ru'] },
  { code: 'kor', label: 'Korean', tokens: ['ko.srt', '.kor.', 'korean', '-ko', '_ko'] },
  { code: 'jpn', label: 'Japanese', tokens: ['ja.srt', '.jpn.', 'japanese', '-ja', '_ja'] },
  { code: 'zho', label: 'Chinese', tokens: ['zh.srt', '.zho.', 'chinese', '-zh', '_zh', 'mandarin'] },
  { code: 'ara', label: 'Arabic', tokens: ['ar.srt', '.ara.', 'arabic', '-ar', '_ar'] },
  { code: 'hin', label: 'Hindi', tokens: ['hi.srt', '.hin.', 'hindi', '-hi', '_hi'] },
  { code: 'tur', label: 'Turkish', tokens: ['tr.srt', '.tur.', 'turkish', '-tr', '_tr'] },
  { code: 'pol', label: 'Polish', tokens: ['pl.srt', '.pol.', 'polish', '-pl', '_pl'] },
  { code: 'nld', label: 'Dutch', tokens: ['nl.srt', '.nld.', 'dutch', '-nl', '_nl'] },
]

export function guessLanguage(fileName = '', preview = []) {
  const name = fileName.toLowerCase()
  for (const l of LANGUAGE_HINTS) {
    if (l.tokens.some((t) => name.includes(t))) return { code: l.code, label: l.label }
  }
  const textLines = (Array.isArray(preview) ? preview : [])
    .map((p) => (typeof p === 'string' ? p : p?.text || ''))
    .join('\n')
  if (textLines) {
    const sample = textLines.toLowerCase()
    if (/[\u04AE\u04AF\u04E8\u04E9]/g.test(sample)) return { code: 'mon', label: 'Mongolian' }
    if (/[\u0400-\u04FF]/g.test(sample)) return { code: 'rus', label: 'Russian' }
    if (/[\uAC00-\uD7AF]/g.test(sample)) return { code: 'kor', label: 'Korean' }
    if (/[\u4E00-\u9FFF]/g.test(sample)) return { code: 'zho', label: 'Chinese' }
  }
  return { code: null, label: 'Detected' }
}

export function pickTitleMatch(candidates, { title, year, type } = {}) {
  if (!candidates.length) return null
  const lower = (title || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const scored = candidates
    .map((c) => {
      let score = 0
      const slug = c.slug || ''
      if (type === 'tv' || type === 'episode' || type === 'series') {
        if (c.type === 'series' || c.type === 'tv' || c.type === 'show') score += 3
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