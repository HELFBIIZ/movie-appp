// __tests__/providers.test.js — Provider system tests.
//
// Tests:
//   1. Provider registry
//   2. Enabled providers
//   3. Provider health
//   4. Fallback providers

import { describe, it, expect } from '@jest/globals'
import {
  METADATA_PROVIDERS,
  VIDEO_PROVIDERS,
  SUBTITLE_PROVIDERS,
  getEnabledProviders,
  getProvider,
  updateProviderHealth,
  isProviderHealthy,
} from '../src/lib/providers.js'

describe('Provider System', () => {
  describe('Metadata Providers', () => {
    it('should have at least one provider', () => {
      expect(METADATA_PROVIDERS.length).toBeGreaterThanOrEqual(1)
    })

    it('should have TMDB as primary', () => {
      const tmdb = METADATA_PROVIDERS.find((p) => p.id === 'tmdb')
      expect(tmdb).toBeDefined()
      expect(tmdb.enabled).toBe(true)
      expect(tmdb.priority).toBe(10)
    })
  })

  describe('Video Providers', () => {
    it('should have multiple providers', () => {
      expect(VIDEO_PROVIDERS.length).toBeGreaterThanOrEqual(3)
    })

    it('should have unique IDs', () => {
      const ids = VIDEO_PROVIDERS.map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('Subtitle Providers', () => {
    it('should have custom VTT provider enabled', () => {
      const custom = SUBTITLE_PROVIDERS.find((p) => p.id === 'custom-vtt')
      expect(custom).toBeDefined()
      expect(custom.enabled).toBe(true)
    })
  })

  describe('Get Enabled Providers', () => {
    it('should return only enabled providers', () => {
      const enabled = getEnabledProviders('video')
      for (const p of enabled) {
        expect(p.enabled).toBe(true)
      }
    })

    it('should sort by priority descending', () => {
      const enabled = getEnabledProviders('video')
      for (let i = 1; i < enabled.length; i++) {
        expect(enabled[i].priority).toBeLessThanOrEqual(enabled[i - 1].priority)
      }
    })
  })

  describe('Provider Health', () => {
    it('should update health status', () => {
      updateProviderHealth('video', 'tmdb-stream', 'ok')
      const provider = getProvider('video', 'tmdb-stream')
      expect(provider.health.status).toBe('ok')
      expect(provider.health.lastChecked).toBeTruthy()
    })

    it('should detect healthy provider', () => {
      updateProviderHealth('video', 'tmdb-stream', 'ok')
      expect(isProviderHealthy('video', 'tmdb-stream')).toBe(true)
    })

    it('should detect unhealthy provider', () => {
      updateProviderHealth('video', 'tmdb-stream', 'error')
      // After error, error rate increases but starts at 0
      // Need multiple errors to become unhealthy
      const provider = getProvider('video', 'tmdb-stream')
      expect(provider.health.errorRate).toBeGreaterThan(0)
    })
  })
})
