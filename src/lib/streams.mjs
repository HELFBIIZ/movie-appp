// src/lib/streams.mjs — resolves browser-playable HLS streams for a TMDB title.
//
// The old default players (vidsrc.buzz / vidcore.org) are cross-origin iframes
// that render subtitles ONLY from their own stream / subtitle APIs — they ignore
// URL params like `?sub.file=`, which is why custom (e.g. Mongolian) subtitles
// never reached the screen, and they are frequently dead/blank inside iframes.
// This module powers the first-party player instead: it asks public source APIs
// for direct HLS manifests, validates each one is PLAIN (unencrypted) HLS the
// browser can actually play, and hands them to hls.js which renders our own VTT
// on top.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

const BOX_PROXY = 'https://box-prox.jeannefrankli-n2-7-2-0-5.workers.dev/https://'
const RIGEL_BASE = `${BOX_PROXY}movish.to/player-sources/rigel`
const MOVY_BASE = `${BOX_PROXY}vidrack.created.app/api/sources/movy`

const cache = new Map()
const TTL = 5 * 60 * 1000

function qualityRank(q) {
  if (/2160|4k/i.test(q || '')) return 5
  if (/1080/i.test(q || '')) return 4
  if (/720/i.test(q || '')) return 3
  if (/480/i.test(q || '')) return 2
  if (/360/i.test(q || '')) return 1
  return 0
}

// Returns the manifest text ONLY if the source is plain HLS the browser can
// actually play. dlproxy manifests are AES-128 encrypted and their key endpoint
// requires a signed browser proof, so hls.js is always cut at keyLoadError on
// them. Skip those regardless of which provider handed them over.
async function plainManifest(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) return null
  const text = await r.text()
  if (!text.includes('#EXTM3U')) return null
  if (text.includes('#EXT-X-KEY')) return null
  if (text.includes('api.dlproxy.com')) return null
  return text
}

// Dedupes by URL, keeps the highest-quality candidates first.
function dedupe(sources) {
  const seen = new Set()
  const out = []
  for (const s of sources) {
    if (!s?.url || seen.has(s.url)) continue
    seen.add(s.url)
    out.push(s)
  }
  return out.sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality))
}

// Validates a list of candidate sources and returns only the PLAIN HLS ones.
async function validatePlain(sources) {
  const valid = []
  for (const s of sources) {
    if (!s?.url) continue
    try {
      if (await plainManifest(s.url)) valid.push(s)
    } catch {}
  }
  return dedupe(valid)
}

async function movySources(tmdbId, { type, season, episode }) {
  const q = type === 'tv' ? `?id=${tmdbId}&type=tv&season=${season || 1}&episode=${episode || 1}` : `?id=${tmdbId}&type=movie`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`${MOVY_BASE}${q}`, { headers: { 'User-Agent': UA } })
      if (!r.ok) continue
      const valid = await validatePlain((await r.json()).sources || [])
      if (valid.length) return valid
    } catch {}
    await new Promise((res) => setTimeout(res, 250 * (attempt + 1)))
  }
  return []
}

async function rigelSources(tmdbId, { type, season, episode }) {
  const rest = type === 'tv' ? `/tv/${tmdbId}/${season || 1}/${episode || 1}` : `/movie/${tmdbId}`
  try {
    const r = await fetch(`${RIGEL_BASE}${rest}`, {
      headers: { 'User-Agent': UA, Referer: 'https://movish.to/', Origin: 'https://movish.to' },
    })
    if (!r.ok) return []
    const j = await r.json()
    const streams = j.streams || j.sources || []
    return streams.map((s) => ({ ...s, provider: 'rigel' }))
  } catch {
    return []
  }
}

// Returns an array of playable HLS candidates (provider, label, quality, url).
// Player tabs index into this list for their own distinct source.
export async function resolveStreamCandidates(
  tmdbId,
  { type = 'movie', season, episode, forceRefresh = false } = {}
) {
  if (!tmdbId) return []
  const key = `${type}:${tmdbId}:${season || 0}:${episode || 0}`
  if (!forceRefresh) {
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL) return hit.candidates
  }

  // Primary: Movy (vidrack.created.app via box-prox worker). Best flavors ship
  // PLAIN (unencrypted) HLS on sun/moon.peakstorm.top with access-control-allow-origin:
  // * — plays in hls.js with zero special headers. The endpoint is flaky
  // (frequently returns empty sources), so movySources retries internally.
  const candidates = []
  let movy = []
  try {
    movy = (await movySources(tmdbId, { type, season, episode })).map((s) => ({
      provider: 'movy',
      label: s.label || 'Movy',
      quality: s.quality,
      url: s.url,
    }))
    candidates.push(...movy)
  } catch {}

  // Fallback: Rigel (movish.to -> api.dlproxy.com). Usually AES-128 encrypted
  // (key endpoint demands a browser proof) so it often won't play — but it is a
  // real distinct backup for titles movy has nothing for, and the player shows
  // an actionable error + retry instead of a blank iframe.
  try {
    const rigel = await rigelSources(tmdbId, { type, season, episode })
    candidates.push(...rigel)
  } catch {}

  const result = dedupe(candidates)
  cache.set(key, { at: Date.now(), candidates: result })
  return result
}

export async function resolveVidStream(tmdbId, opts = {}) {
  const candidates = await resolveStreamCandidates(tmdbId, opts)
  return candidates[0] || null
}