// src/lib/players.js — Player adapter registry and fallback system.
//
// Each player adapter implements the VideoPlayerAdapter interface:
//   - id, label, type (hls|iframe|embed)
//   - canPlay(source) — whether this adapter can handle the source
//   - getSourceUrl(tmdbId, opts) — returns the playback URL
//   - supportsSubtitles — whether the player supports external subtitles
//   - supportsQuality — whether quality selection is available
//   - priority — higher = preferred (used for fallback ordering)
//
// The system automatically falls back between compatible players when one fails.

export const PLAYER_ADAPTERS = [
  {
    id: 'hls-native',
    label: 'Player 1 (HLS)',
    type: 'hls',
    canPlay: (source) => source?.url && (source.url.endsWith('.m3u8') || source.url.includes('.m3u8')),
    getSourceUrl: (tmdbId, { type = 'movie', season, episode, variant = 0 } = {}) => {
      return `/api/stream/tmdb?tmdbId=${tmdbId}&type=${type}&variant=${variant}${type === 'tv' ? `&season=${season || 1}&episode=${episode || 1}` : ''}`
    },
    supportsSubtitles: true,
    supportsQuality: true,
    supportsFullscreen: true,
    priority: 10,
  },
  {
    id: 'hls-proxy',
    label: 'Player 2 (HLS Proxy)',
    type: 'hls',
    canPlay: (source) => source?.url && (source.url.endsWith('.m3u8') || source.url.includes('.m3u8')),
    getSourceUrl: (tmdbId, { type = 'movie', season, episode, variant = 1 } = {}) => {
      return `/api/stream/tmdb?tmdbId=${tmdbId}&type=${type}&variant=${variant}${type === 'tv' ? `&season=${season || 1}&episode=${episode || 1}` : ''}`
    },
    supportsSubtitles: true,
    supportsQuality: true,
    supportsFullscreen: true,
    priority: 9,
  },
  {
    id: 'vidsrc',
    label: 'Player 3 (VidSrc)',
    type: 'iframe',
    canPlay: (source) => true, // fallback — always available
    getSourceUrl: (tmdbId, { type = 'movie', season, episode } = {}) => {
      const base = 'https://vidsrc.buzz'
      if (type === 'tv') return `${base}/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
      return `${base}/embed/movie/${tmdbId}`
    },
    supportsSubtitles: false,
    supportsQuality: false,
    supportsFullscreen: true,
    priority: 8,
  },
  {
    id: 'vidcore',
    label: 'Player 4 (VidCore)',
    type: 'iframe',
    canPlay: (source) => true,
    getSourceUrl: (tmdbId, { type = 'movie', season, episode } = {}) => {
      const base = 'https://vidcore.org'
      if (type === 'tv') return `${base}/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
      return `${base}/embed/movie/${tmdbId}`
    },
    supportsSubtitles: false,
    supportsQuality: false,
    supportsFullscreen: true,
    priority: 7,
  },
  {
    id: 'autoembed',
    label: 'Player 5 (AutoEmbed)',
    type: 'iframe',
    canPlay: (source) => true,
    getSourceUrl: (tmdbId, { type = 'movie', season, episode } = {}) => {
      const base = 'https://autoembed.cc'
      if (type === 'tv') return `${base}/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`
      return `${base}/embed/movie/${tmdbId}`
    },
    supportsSubtitles: false,
    supportsQuality: false,
    supportsFullscreen: true,
    priority: 6,
  },
  {
    id: 'multiembed',
    label: 'Player 6 (MultiEmbed)',
    type: 'iframe',
    canPlay: (source) => true,
    getSourceUrl: (tmdbId, { type = 'movie', season, episode } = {}) => {
      const base = 'https://multiembed.mov'
      if (type === 'tv') return `${base}/?video=${tmdbId}&s=${season || 1}&e=${episode || 1}`
      return `${base}/?video=${tmdbId}`
    },
    supportsSubtitles: false,
    supportsQuality: false,
    supportsFullscreen: true,
    priority: 5,
  },
  {
    id: '2embed',
    label: 'Player 7 (2Embed)',
    type: 'iframe',
    canPlay: (source) => true,
    getSourceUrl: (tmdbId, { type = 'movie', season, episode } = {}) => {
      const base = 'https://2embed.cc'
      if (type === 'tv') return `${base}/embedtv/${tmdbId}&s=${season || 1}&e=${episode || 1}`
      return `${base}/${tmdbId}`
    },
    supportsSubtitles: false,
    supportsQuality: false,
    supportsFullscreen: true,
    priority: 4,
  },
]

/**
 * Get player adapter by ID.
 */
export function getPlayerAdapter(playerId) {
  return PLAYER_ADAPTERS.find((p) => p.id === playerId) || null
}

/**
 * Get all available player adapters sorted by priority.
 */
export function getAvailablePlayers() {
  return [...PLAYER_ADAPTERS].sort((a, b) => b.priority - a.priority)
}

/**
 * Get the next fallback player after the current one fails.
 * Returns null if no more players available.
 */
export function getNextPlayer(currentPlayerId, failedPlayerIds = []) {
  const available = getAvailablePlayers()
  const failed = new Set(failedPlayerIds)
  failed.add(currentPlayerId)

  for (const player of available) {
    if (!failed.has(player.id)) return player
  }
  return null
}

/**
 * Get a player's source URL for a movie.
 */
export function getPlayerSourceUrl(playerId, tmdbId, opts = {}) {
  const adapter = getPlayerAdapter(playerId)
  if (!adapter) return null
  return adapter.getSourceUrl(tmdbId, opts)
}

/**
 * Check if a player supports Mongolian subtitles.
 */
export function playerSupportsSubtitles(playerId) {
  const adapter = getPlayerAdapter(playerId)
  return adapter?.supportsSubtitles ?? false
}
