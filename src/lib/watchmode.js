const WATCHMODE_BASE_URL = 'https://api.watchmode.com/v1'

const TYPE_LABELS = {
  sub: 'Stream',
  flatrate: 'Stream',
  ads: 'Stream (Ads)',
  free: 'Free',
  rent: 'Rent',
  buy: 'Buy',
}

const TYPE_ORDER = { sub: 0, flatrate: 0, ads: 1, free: 2, rent: 3, buy: 4 }

export function getWatchmodeApiKey() {
  return process.env.WATCHMODE_API_KEY || ''
}

async function fetchWatchmode(path) {
  const apiKey = getWatchmodeApiKey()
  if (!apiKey) return null

  const url = `${WATCHMODE_BASE_URL}${path}${path.includes('?') ? '&' : '?'}apiKey=${apiKey}`
  const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  return res.json()
}

export async function getStreamingSources(tmdbId) {
  if (!tmdbId || !getWatchmodeApiKey()) return []

  const search = await fetchWatchmode(
    `/search/?search_field=tmdb_movie_id&search_value=${encodeURIComponent(tmdbId)}`
  )
  const results = search?.title_results
  if (!Array.isArray(results) || !results.length) return []

  const title =
    results.find((r) => String(r.tmdb_id) === String(tmdbId) && r.tmdb_type === 'movie') ||
    results[0]
  if (!title?.id) return []

  const sources = await fetchWatchmode(`/title/${title.id}/sources/`)
  if (!Array.isArray(sources)) return []

  const seen = new Set()
  const items = []
  for (const s of sources) {
    const region = (s.region || 'US').toUpperCase()
    if (region !== 'US') continue

    const key = `${s.name}__${s.type}`
    if (seen.has(key)) continue
    seen.add(key)

    items.push({
      name: s.name,
      type: s.type,
      label: TYPE_LABELS[s.type] || s.type,
      url: s.web_url || s.android_url || s.ios_url || null,
      price: s.price || null,
    })
  }

  items.sort(
    (a, b) =>
      (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9) ||
      a.name.localeCompare(b.name)
  )

  return items.slice(0, 12)
}