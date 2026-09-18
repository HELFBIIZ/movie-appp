// __tests__/players.test.js — Player adapter system tests.
//
// Tests:
//   1. Player adapter registry
//   2. Fallback logic
//   3. Source URL generation
//   4. Subtitle support detection

import { describe, it, expect } from '@jest/globals'
import {
  PLAYER_ADAPTERS,
  getPlayerAdapter,
  getAvailablePlayers,
  getNextPlayer,
  getPlayerSourceUrl,
  playerSupportsSubtitles,
} from '../src/lib/players.js'

describe('Player System', () => {
  describe('Adapter Registry', () => {
    it('should have 7 player adapters', () => {
      expect(PLAYER_ADAPTERS.length).toBe(7)
    })

    it('should have unique IDs', () => {
      const ids = PLAYER_ADAPTERS.map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('should have required fields', () => {
      for (const adapter of PLAYER_ADAPTERS) {
        expect(adapter).toHaveProperty('id')
        expect(adapter).toHaveProperty('label')
        expect(adapter).toHaveProperty('type')
        expect(adapter).toHaveProperty('priority')
        expect(adapter).toHaveProperty('getSourceUrl')
        expect(adapter).toHaveProperty('supportsSubtitles')
        expect(adapter).toHaveProperty('supportsQuality')
      }
    })
  })

  describe('Get Adapter', () => {
    it('should return adapter by ID', () => {
      const adapter = getPlayerAdapter('hls-native')
      expect(adapter).not.toBeNull()
      expect(adapter.id).toBe('hls-native')
    })

    it('should return null for unknown ID', () => {
      const adapter = getPlayerAdapter('nonexistent')
      expect(adapter).toBeNull()
    })
  })

  describe('Fallback Logic', () => {
    it('should get next player after current fails', () => {
      const next = getNextPlayer('hls-native', ['hls-native'])
      expect(next).not.toBeNull()
      expect(next.id).not.toBe('hls-native')
    })

    it('should skip failed players', () => {
      const next = getNextPlayer('hls-native', ['hls-native', 'hls-proxy'])
      expect(next).not.toBeNull()
      expect(next.id).not.toBe('hls-native')
      expect(next.id).not.toBe('hls-proxy')
    })

    it('should return null when all players failed', () => {
      const allIds = PLAYER_ADAPTERS.map((p) => p.id)
      const next = getNextPlayer('hls-native', allIds)
      expect(next).toBeNull()
    })
  })

  describe('Source URLs', () => {
    it('should generate source URL for HLS player', () => {
      const url = getPlayerSourceUrl('hls-native', '12345', { type: 'movie' })
      expect(url).toContain('tmdbId=12345')
      expect(url).toContain('type=movie')
    })

    it('should generate source URL for TV show', () => {
      const url = getPlayerSourceUrl('hls-native', '12345', { type: 'tv', season: 2, episode: 3 })
      expect(url).toContain('type=tv')
      expect(url).toContain('season=2')
      expect(url).toContain('episode=3')
    })

    it('should return null for unknown player', () => {
      const url = getPlayerSourceUrl('nonexistent', '12345')
      expect(url).toBeNull()
    })
  })

  describe('Subtitle Support', () => {
    it('should report subtitle support correctly', () => {
      expect(playerSupportsSubtitles('hls-native')).toBe(true)
      expect(playerSupportsSubtitles('hls-proxy')).toBe(true)
      expect(playerSupportsSubtitles('vidsrc')).toBe(false)
    })
  })
})
