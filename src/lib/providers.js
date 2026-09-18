// src/lib/providers.js — Provider abstraction for movie metadata, video, and subtitles.
//
// Each provider implements a common interface:
//   - name: provider identifier
//   - enabled: whether the provider is active
//   - priority: higher = preferred
//   - rateLimit: requests per minute
//   - health: last health check status
//
// The system automatically falls back between providers when one fails.

// ─────────────────────────── METADATA PROVIDERS ───────────────────────────

export const METADATA_PROVIDERS = [
  {
    id: 'tmdb',
    name: 'TMDB (The Movie Database)',
    enabled: true,
    priority: 10,
    rateLimit: 40, // requests per 10 seconds
    apiKey: () => process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY,
    baseUrl: 'https://api.themoviedb.org/3',
    supports: { search: true, metadata: true, posters: true, backdrops: true, cast: true, genres: true },
    health: { status: 'unknown', lastChecked: null, errorRate: 0 },
  },
  {
    id: 'omdb',
    name: 'OMDB API',
    enabled: false, // enable when API key is provided
    priority: 5,
    rateLimit: 10,
    apiKey: () => process.env.OMDB_API_KEY,
    baseUrl: 'http://www.omdbapi.com',
    supports: { search: true, metadata: true, posters: true },
    health: { status: 'unknown', lastChecked: null, errorRate: 0 },
  },
]

// ─────────────────────────── VIDEO PROVIDERS ───────────────────────────

export const VIDEO_PROVIDERS = [
  {
    id: 'tmdb-stream',
    name: 'TMDB Stream (via box-prox)',
    enabled: true,
    priority: 10,
    type: 'hls',
    baseUrl: 'https://box-prox.jeannefrankli-n2-7-2-0-5.workers.dev/https://',
    supports: { hls: true, dash: false, mp4: false, subtitles: true },
    health: { status: 'unknown', lastChecked: null, errorRate: 0 },
  },
  {
    id: 'movy',
    name: 'Movy (vidrack)',
    enabled: true,
    priority: 8,
    type: 'hls',
    baseUrl: 'https://box-prox.jeannefrankli-n2-7-2-0-5.workers.dev/https://vidrack.created.app/api/sources/movy',
    supports: { hls: true, dash: false, mp4: false, subtitles: false },
    health: { status: 'unknown', lastChecked: null, errorRate: 0 },
  },
  {
    id: 'rigel',
    name: 'Rigel (movish.to)',
    enabled: true,
    priority: 6,
    type: 'hls',
    baseUrl: 'https://box-prox.jeannefrankli-n2-7-2-0-5.workers.dev/https://movish.to/player-sources/rigel',
    supports: { hls: true, dash: false, mp4: false, subtitles: false },
    health: { status: 'unknown', lastChecked: null, errorRate: 0 },
  },
  {
    id: 'vidsrc',
    name: 'VidSrc',
    enabled: true,
    priority: 4,
    type: 'iframe',
    baseUrl: 'https://vidsrc.buzz',
    supports: { hls: false, dash: false, mp4: false, subtitles: false, iframe: true },
    health: { status: 'unknown', lastChecked: null, errorRate: 0 },
  },
  {
    id: 'vidcore',
    name: 'VidCore',
    enabled: true,
    priority: 3,
    type: 'iframe',
    baseUrl: 'https://vidcore.org',
    supports: { hls: false, dash: false, mp4: false, subtitles: false, iframe: true },
    health: { status: 'unknown', lastChecked: null, errorRate: 0 },
  },
]

// ─────────────────────────── SUBTITLE PROVIDERS ───────────────────────────

export const SUBTITLE_PROVIDERS = [
  {
    id: 'opensubtitles',
    name: 'OpenSubtitles',
    enabled: false, // enable when API key is provided
    priority: 10,
    apiKey: () => process.env.OPENSUBTITLES_API_KEY,
    baseUrl: 'https://api.opensubtitles.com/api/v1',
    supports: { vtt: true, srt: true, languages: ['mn', 'en', 'ko', 'ja', 'zh'] },
    health: { status: 'unknown', lastChecked: null, errorRate: 0 },
  },
  {
    id: 'custom-vtt',
    name: 'Custom VTT (local)',
    enabled: true,
    priority: 8,
    baseUrl: '/api/subtitles',
    supports: { vtt: true, srt: false, languages: ['mn', 'en'] },
    health: { status: 'ok', lastChecked: new Date().toISOString(), errorRate: 0 },
  },
  {
    id: 'ai-translated',
    name: 'AI Translated Subtitles',
    enabled: true,
    priority: 6,
    baseUrl: '/api/subtitles/translate',
    supports: { vtt: true, srt: false, languages: ['mn'] },
    health: { status: 'unknown', lastChecked: null, errorRate: 0 },
  },
]

// ─────────────────────────── PROVIDER HELPERS ───────────────────────────

/**
 * Get enabled providers of a type, sorted by priority.
 */
export function getEnabledProviders(type = 'metadata') {
  const providers = type === 'metadata' ? METADATA_PROVIDERS
    : type === 'video' ? VIDEO_PROVIDERS
    : SUBTITLE_PROVIDERS
  return providers
    .filter((p) => p.enabled)
    .sort((a, b) => b.priority - a.priority)
}

/**
 * Get a provider by ID and type.
 */
export function getProvider(type, providerId) {
  const providers = type === 'metadata' ? METADATA_PROVIDERS
    : type === 'video' ? VIDEO_PROVIDERS
    : SUBTITLE_PROVIDERS
  return providers.find((p) => p.id === providerId) || null
}

/**
 * Update provider health status.
 */
export function updateProviderHealth(type, providerId, status, error = null) {
  const provider = getProvider(type, providerId)
  if (!provider) return
  provider.health.status = status
  provider.health.lastChecked = new Date().toISOString()
  if (error) provider.health.errorRate = Math.min(1, provider.health.errorRate + 0.1)
  else provider.health.errorRate = Math.max(0, provider.health.errorRate - 0.05)
}

/**
 * Check if a provider is healthy (error rate < 50%).
 */
export function isProviderHealthy(type, providerId) {
  const provider = getProvider(type, providerId)
  if (!provider || !provider.enabled) return false
  return provider.health.errorRate < 0.5
}
