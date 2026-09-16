const OS_API = process.env.OPENSUBTITLES_API_BASE || 'https://api.opensubtitles.com/api/v1'
const UA = 'VXNTA v1.0'

let tokenCache = { token: null, at: 0 }

function osHeaders(extra = {}) {
  return {
    Accept: '*/*',
    'Api-Key': process.env.OPENSUBTITLES_API_KEY,
    'User-Agent': UA,
    'Accept-Language': 'en',
    ...extra,
  }
}

async function osLoginToken() {
  const now = Date.now()
  if (tokenCache.token && now - tokenCache.at < 55 * 60 * 1000) return tokenCache.token
  const user = process.env.OPENSUBTITLES_USERNAME
  const pass = process.env.OPENSUBTITLES_PASSWORD
  if (!user || !pass) return null
  const res = await fetch(`${OS_API}/login`, {
    method: 'POST',
    headers: osHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username: user, password: pass }),
  })
  if (!res.ok) return null
  const data = await res.json()
  if (data.token) {
    tokenCache = { token: data.token, at: now }
  }
  return data.token || null
}

export async function osSearch({ tmdbId, lang, title, year, type, season, episode, limit = 10 }) {
  const apiKey = process.env.OPENSUBTITLES_API_KEY
  if (!apiKey) return null

  const params = new URLSearchParams()
  if (tmdbId) params.set('tmdb_id', tmdbId)
  if (title) params.set('query', title)
  if (year) params.set('year', year)
  if (lang) params.set('languages', lang)
  params.set('type', type || 'movie')
  if (type === 'episode' && season != null) params.set('season_number', String(season))
  if (type === 'episode' && episode != null) params.set('episode_number', String(episode))

  const res = await fetch(`${OS_API}/subtitles?${params}`, { headers: osHeaders() })
  if (!res.ok) return null
  const data = await res.json()

  return (data.data || []).slice(0, limit).map((item) => {
    const attrs = item.attributes
    const file = attrs.files?.[0]
    return {
      id: item.id,
      provider: 'opensubtitles',
      fileId: file?.file_id,
      fileName: file?.file_name || attrs.release,
      language: attrs.language,
      languageLabel: attrs.language,
      rating: attrs.ratings,
      downloadCount: attrs.download_count,
      format: file?.format,
    }
  })
}

export async function osDownloadContent(fileId) {
  const apiKey = process.env.OPENSUBTITLES_API_KEY
  if (!apiKey) throw new Error('OpenSubtitles API key not configured')

  const token = await osLoginToken()
  const res = await fetch(`${OS_API}/download`, {
    method: 'POST',
    headers: osHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    body: JSON.stringify({ file_id: fileId, sub_format: 'srt' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'OpenSubtitles download failed')

  const link = data.link
  if (!link) throw new Error('OpenSubtitles download returned no link')

  const dl = await fetch(link, { headers: { 'User-Agent': UA } })
  if (!dl.ok) throw new Error(`OpenSubtitles file fetch failed (${dl.status})`)
  return dl.text()
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function osAiTranslate(srtContent, api, token) {
  const qs = new URLSearchParams({ api, translate_from: 'en', translate_to: 'mn', file: srtContent })
  const res = await fetch(`${OS_API}/ai/translate?${qs}`, {
    method: 'POST',
    headers: osHeaders({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error((data.message || `OpenSubtitles AI translate failed ${res.status}`) + ` | api=${api}`)
  const correlationId = data.correlation_id
  if (!correlationId) throw new Error(`OpenSubtitles AI translate: no correlation_id (${JSON.stringify(data).slice(0, 120)})`)

  for (let i = 0; i < 120; i++) {
    const s = await fetch(`${OS_API}/ai/translate/${correlationId}`, { headers: osHeaders(token ? { Authorization: `Bearer ${token}` } : {}) })
    const sj = await s.json().catch(() => ({}))
    if (sj.status === 'COMPLETED') {
      const url = sj.data?.url
      if (!url) throw new Error('OpenSubtitles AI translate completed but no file url')
      const f = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!f.ok) throw new Error(`OpenSubtitles AI translated file fetch failed (${f.status})`)
      return { content: await f.text(), api }
    }
    if (/FAILED|ERROR/i.test(sj.status || '')) throw new Error(sj.message || `OpenSubtitles AI translate failed (${sj.status})`)
    await sleep(3000)
  }
  throw new Error('OpenSubtitles AI translate timed out')
}

export async function osTranslateToMongolian(srtContent) {
  const apiKey = process.env.OPENSUBTITLES_API_KEY
  if (!apiKey) throw new Error('OpenSubtitles API key not configured')

  const token = await osLoginToken()
  if (!token) throw new Error('OpenSubtitles user login not configured')

  let lastErr = null
  for (const api of ['deepl2', 'aws']) {
    try {
      return await osAiTranslate(srtContent, api, token)
    } catch (err) {
      if (/language|supported|not.*support|error/i.test(err.message || '')) lastErr = err
      else throw err
    }
  }
  if (lastErr) throw lastErr
  throw new Error('OpenSubtitles AI translate unavailable')
}