const OS_API = process.env.OPENSUBTITLES_API_BASE || 'https://api.opensubtitles.com/api/v1';
const UA = 'VXNTA v1.0';

let tokenCache = { token: null, baseUrl: OS_API, at: 0 };
let loginFlight;

function osHeaders(extra = {}) {
  return {
    Accept: '*/*',
    'Api-Key': process.env.OPENSUBTITLES_API_KEY,
    'User-Agent': UA,
    'Accept-Language': 'en',
    ...extra,
  };
}

async function osLoginToken() {
  if (!loginFlight)
    loginFlight = login().finally(() => {
      loginFlight = undefined;
    });
  return loginFlight;
}
async function login() {
  const now = Date.now();
  if (tokenCache.token && now - tokenCache.at < 55 * 60 * 1000) return tokenCache.token;
  const user = process.env.OPENSUBTITLES_USERNAME;
  const pass = process.env.OPENSUBTITLES_PASSWORD;
  if (!user || !pass) return null;
  const res = await fetch(`${OS_API}/login`, {
    method: 'POST',
    headers: osHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username: user, password: pass }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.token) {
    const host = ['api.opensubtitles.com', 'vip-api.opensubtitles.com'].includes(data.base_url)
      ? data.base_url
      : 'api.opensubtitles.com';
    tokenCache = { token: data.token, baseUrl: `https://${host}/api/v1`, at: now };
  }
  return data.token || null;
}

export async function osAiSession() {
  const token = await osLoginToken();
  if (!token)
    throw new Error('Монгол орчуулгын үйлчилгээ түр боломжгүй. MN хадмал файл нэмж болно.');
  return { baseUrl: tokenCache.baseUrl, headers: osHeaders({ Authorization: `Bearer ${token}` }) };
}

export async function osSearch({ tmdbId, lang, title, year, type, season, episode, limit = 10 }) {
  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams();
  if (tmdbId) params.set(type === 'episode' ? 'parent_tmdb_id' : 'tmdb_id', tmdbId);
  if (!tmdbId && title) params.set('query', title);
  if (year && type !== 'episode') params.set('year', year);
  if (lang) params.set('languages', lang);
  params.set('type', type || 'movie');
  if (type === 'episode' && season !== null && season !== undefined)
    params.set('season_number', String(season));
  if (type === 'episode' && episode !== null && episode !== undefined)
    params.set('episode_number', String(episode));

  const res = await fetch(`${OS_API}/subtitles?${params}`, {
    headers: osHeaders(),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const data = await res.json();

  return (data.data || []).slice(0, limit).map((item) => {
    const attrs = item.attributes;
    const file = attrs.files?.[0];
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
      tmdbId: attrs.feature_details?.tmdb_id,
      parentTmdbId: attrs.feature_details?.parent_tmdb_id,
      season: attrs.feature_details?.season_number,
      episode: attrs.feature_details?.episode_number,
      machineTranslated: Boolean(attrs.machine_translated || attrs.ai_translated),
    };
  });
}

export async function osDownloadContent(fileId) {
  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  if (!apiKey) throw new Error('OpenSubtitles API key not configured');

  const token = await osLoginToken();
  const res = await fetch(`${token ? tokenCache.baseUrl : OS_API}/download`, {
    method: 'POST',
    headers: osHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    body: JSON.stringify({ file_id: fileId, sub_format: 'srt' }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'OpenSubtitles download failed');

  const link = data.link;
  if (!link) throw new Error('OpenSubtitles download returned no link');

  const dl = await fetch(link, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(15000),
  });
  if (!dl.ok) throw new Error(`OpenSubtitles file fetch failed (${dl.status})`);
  return dl.text();
}
