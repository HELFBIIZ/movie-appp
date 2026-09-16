// src/lib/streams.mjs — resolves browser-playable HLS streams for a TMDB title.
//
// The old default players (vidsrc.buzz / vidcore.org) are cross-origin iframes
// that render subtitles ONLY from their own stream / subtitle APIs — they ignore
// URL params like `?sub.file=`, which is why custom (e.g. Mongolian) subtitles
// never reached the screen, and they are frequently dead/blank inside iframes.
//
// This module powers the first-party player instead: it asks public source APIs
// for direct HLS manifests, validates each one is PLAIN (unencrypted) HLS the
// browser can actually play, and hands them to hls.js which renders our own VTT
// on top.
//
// Resolution order (each source is tried independently so a partial failure
// doesn't abort the whole lookup):
//   1. Movy  → vidrack.created.app/api/sources/movy  (proxied then direct)
//   2. Rigel → movish.to/player-sources/rigel         (proxied then direct)
//   3. VidSrc iFrame API fallback                    (vidsrc.buzz / vidcore.org)
//
// The iFrame fallback exists so Player 1 / Player 2 always have *something*
// to show — even a vanilla embed is better than a blank screen when every
// direct-HLS provider is down.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

const BOX_PROXY = 'https://box-prox.jeannefrankli-n2-7-2-0-5.workers.dev/https://'
const RIGEL_PROXIED = `${BOX_PROXY}movish.to/player-sources/rigel`
const MOVY_PROXIED = `${BOX_PROXY}vidrack.created.app/api/sources/movy`
const RIGEL_DIRECT = 'https://movish.to/player-sources/rigel'
const MOVY_DIRECT = 'https://vidrack.created.app/api/sources/movy'
const VIDSRC_BASE = 'https://vidsrc.buzz'
const VIDCORE_BASE = 'https://vidcore.org'

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
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!r.ok) return null
    const text = await r.text()
    if (!text.includes('#EXTM3U')) return null
    if (text.includes('#EXT-X-KEY')) return null
    if (text.includes('api.dlproxy.com')) return null
    return text
  } catch {
    return null
  }
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
    if (await plainManifest(s.url)) valid.push(s)
  }
  return dedupe(valid)
}

// Try fetching JSON from a list of base URLs — first one that yields valid
// plain-HLS sources wins. This makes the proxy a performance layer, not a
// single point of failure: if the Cloudflare Worker is down we silently fall
// back to the direct endpoint.
async function fetchFromProviders(bases, tmdbId, { type, season, episode }) {
  const q = type === 'tv'
    ? `?id=${tmdbId}&type=tv&season=${season || 1}&episode=${episode || 1}`
    : `?id=${tmdbId}&type=movie`
  const rest = type === 'tv'
    ? `/tv/${tmdbId}/${season || 1}/${episode || 1}`
    : `/movie/${tmdbId}`

  for (const base of bases) {
    try {
      const url = base.includes('/movie/') || base.includes('/tv/')
        ? `${base}${rest}`
        : `${base}${q}`
      const r = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Referer: 'https://movish.to/',
          Origin: 'https://movish.to',
        },
      })
      if (!r.ok) continue
      const j = await r.json()
      const srcs = j.sources || j.streams || []
      const validated = await validatePlain(srcs)
      if (validated.length) return validated
    } catch {}
  }
  return []
}

async function movySources(tmdbId, { type, season, episode }) {
  // Try proxied first (adds CORS + caching), then direct.
  return fetchFromProviders([MOVY_PROXIED, MOVY_DIRECT], tmdbId, { type, season, episode })
}

async function rigelSources(tmdbId, { type, season, episode }) {
  // Try proxied first, then direct.
  const bases = [RIGEL_PROXIED, RIGEL_DIRECT]
  const rest = type === 'tv'
    ? `/tv/${tmdbId}/${season || 1}/${episode || 1}`
    : `/movie/${tmdbId}`

  for (const base of bases) {
    try {
      const r = await fetch(`${base}${rest}`, {
        headers: {
          'User-Agent': UA,
          Referer: 'https://movish.to/',
          Origin: 'https://movish.to',
        },
      })
      if (!r.ok) continue
      const j = await r.json()
      const streams = j.streams || j.sources || []
      const mapped = streams.map((s) => ({ ...s, provider: 'rigel' }))
      const validated = await validatePlain(mapped)
      if (validated.length) return validated
    } catch {}
  }
  return []
}

// VidSrc iFrame API — a last-resort fallback so Player 1 / Player 2 always
// have a playable link. These are iframes (not plain HLS), so we mark them
// with provider `iframe` so the player can render them differently.
function vidsrcFallbacks(tmdbId, mediaType, season, episode) {
  if (!tmdbId) return []
  const id = String(tmdbId)
  if (mediaType === 'tv') {
    return [
      {
        provider: 'vidsrc',
        label: 'VidSrc TV',
        quality: '720p',
        url: `${VIDSRC_BASE}/embed/tv/${id}/${season || 1}/${episode || 1}`,
        type: 'iframe',
      },
    ]
  }
  return [
    {
      provider: 'vidsrc',
      label: 'VidSrc',
      quality: '720p',
      url: `${VIDSRC_BASE}/embed/movie/${id}`,
      type: 'iframe',
    },
    {
      provider: 'vidcore',
      label: 'VidCore',
      quality: '720p',
      url: `${VIDCORE_BASE}/embed/movie/${id}`,
      type: 'iframe',
    },
  ]
}

// Returns an array of playable HLS candidates (provider, label, quality, url).
// Player tabs index into this list for their own distinct source.
export async function resolveStreamCandidates(
  tmdbId,
  { type = 'movie', season, episode, forceRefresh = false, mediaType = type } = {}
) {
  if (!tmdbId) return []
  const key = `${type}:${tmdbId}:${season || 0}:${episode || 0}`
  if (!forceRefresh) {
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL) return hit.candidates
  }

  // Collect candidates from all providers. We always return SOMETHING so the
  // player tabs have distinct entries — even if the only option is an iframe.
  const candidates = []

  // Primary: Movy — best flavors ship PLAIN (unencrypted) HLS on peakstorm.top
  // with access-control-allow-origin: * — plays in hls.js with zero special
  // headers. The endpoint is flaky (frequently returns empty sources), so
  // movySources tries both proxied and direct.
  try {
    const movy = await movySources(tmdbId, { type, season, episode })
    candidates.push(
      ...movy.map((s) => ({
        provider: 'movy',
        label: s.label || 'Movy',
        quality: s.quality,
        url: s.url,
      }))
    )
  } catch {}

  // Fallback: Rigel (movish.to -> api.dlproxy.com). Usually AES-128 encrypted
  // (key endpoint demands a browser proof) so it often won't play — but it is
  // a real distinct backup for titles movy has nothing for, and the player
  // shows an actionable error + retry instead of a blank iframe.
  try {
    const rigel = await rigelSources(tmdbId, { type, season, episode })
    candidates.push(...rigel)
  } catch {}

  // De-duplicate plain HLS first; if we got at least one real stream, return.
  let result = dedupe(candidates)

  // If no plain-HLS sources survived validation, fall back to iframe embeds
  // so Player 1 / Player 2 always have distinct, switchable options. The
  // player component detects `type: 'iframe'` and renders an <iframe>.
  if (result.length === 0) {
    result = dedupe([...result, ...vidsrcFallbacks(tmdbId, mediaType, season, episode)])
  }

  cache.set(key, { at: Date.now(), candidates: result })
  return result
}

export async function resolveVidStream(tmdbId, opts = {}) {
  const candidates = await resolveStreamCandidates(tmdbId, opts)
  return candidates[0] || null
}
