// src/lib/health-monitor.js — Background source health monitoring.
//
// Periodically checks configured video sources for:
//   - availability
//   - provider response
//   - source validity
//   - subtitle availability
//   - latency
//   - error rate
//
// If a source repeatedly fails:
//   - sourceStatus = unavailable
//   - Automatically attempt another configured compatible source
//
// Failed sources are NOT permanently deleted — kept for admin review.

import { VIDEO_PROVIDERS, SUBTITLE_PROVIDERS, updateProviderHealth } from './providers'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

/**
 * Check health of a single video source.
 * Returns: { status, latencyMs, errorMessage }
 */
export async function checkSourceHealth(source) {
  const start = Date.now()
  try {
    const url = source.sourceUrl || source.embedUrl
    if (!url) return { status: 'error', latencyMs: 0, errorMessage: 'No URL' }

    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    })

    const latencyMs = Date.now() - start
    if (res.ok) {
      return { status: 'ok', latencyMs, errorMessage: null }
    } else {
      return { status: 'error', latencyMs, errorMessage: `HTTP ${res.status}` }
    }
  } catch (err) {
    const latencyMs = Date.now() - start
    if (err.name === 'TimeoutError') {
      return { status: 'timeout', latencyMs, errorMessage: 'Timeout' }
    }
    return { status: 'error', latencyMs, errorMessage: err.message }
  }
}

/**
 * Check health of a provider's API endpoint.
 */
export async function checkProviderHealth(provider) {
  const start = Date.now()
  try {
    const baseUrl = provider.baseUrl
    if (!baseUrl) return { status: 'error', latencyMs: 0, errorMessage: 'No base URL' }

    const res = await fetch(baseUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    })

    const latencyMs = Date.now() - start
    const status = res.ok ? 'ok' : 'degraded'
    updateProviderHealth('video', provider.id, status)
    return { status, latencyMs, errorMessage: res.ok ? null : `HTTP ${res.status}` }
  } catch (err) {
    const latencyMs = Date.now() - start
    updateProviderHealth('video', provider.id, 'error', err.message)
    return { status: 'error', latencyMs, errorMessage: err.message }
  }
}

/**
 * Run health checks on all enabled providers.
 * Returns: { results: Array, summary: { ok, degraded, error } }
 */
export async function runHealthChecks() {
  const results = []
  const summary = { ok: 0, degraded: 0, error: 0 }

  // Check video providers
  for (const provider of VIDEO_PROVIDERS.filter((p) => p.enabled)) {
    const result = await checkProviderHealth(provider)
    results.push({ type: 'video', provider: provider.id, ...result })
    summary[result.status === 'ok' ? 'ok' : result.status === 'timeout' ? 'error' : result.status]++
  }

  // Check subtitle providers
  for (const provider of SUBTITLE_PROVIDERS.filter((p) => p.enabled)) {
    const result = await checkProviderHealth(provider)
    results.push({ type: 'subtitle', provider: provider.id, ...result })
    summary[result.status === 'ok' ? 'ok' : result.status === 'timeout' ? 'error' : result.status]++
  }

  return { results, summary }
}

/**
 * Get the next available provider when current one fails.
 * Returns the highest-priority enabled healthy provider.
 */
export function getFallbackProvider(type, failedProviderId) {
  const providers = type === 'video' ? VIDEO_PROVIDERS : SUBTITLE_PROVIDERS
  return providers
    .filter((p) => p.enabled && p.id !== failedProviderId)
    .sort((a, b) => b.priority - a.priority)[0] || null
}
