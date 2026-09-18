// src/lib/source-validation.js — Video source validation before publication.
//
// Every discovered video source must be validated before being published.
// Checks: provider availability, source validity, playback capability,
// supported format, subtitle capability, provider restrictions, source health.

import { getProvider, updateProviderHealth, isProviderHealthy } from './providers'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

/**
 * Validate a video source before publication.
 * Returns: { valid: boolean, status: string, errors: string[] }
 */
export async function validateVideoSource(source) {
  const errors = []
  let status = 'pending_verification'

  // 1. Check provider exists and is enabled
  const provider = getProvider('video', source.provider)
  if (!provider) {
    errors.push(`Unknown provider: ${source.provider}`)
    status = 'unavailable'
    return { valid: false, status, errors }
  }
  if (!provider.enabled) {
    errors.push(`Provider ${source.provider} is disabled`)
    status = 'disabled'
    return { valid: false, status, errors }
  }

  // 2. Check provider health
  if (!isProviderHealthy('video', source.provider)) {
    errors.push(`Provider ${source.provider} is unhealthy`)
    status = 'unavailable'
  }

  // 3. Validate source URL if provided
  if (source.sourceUrl) {
    try {
      const res = await fetch(source.sourceUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        errors.push(`Source URL returned ${res.status}`)
        status = 'unavailable'
      }
    } catch (err) {
      errors.push(`Source URL unreachable: ${err.message}`)
      status = 'unavailable'
    }
  }

  // 4. Validate embed URL if iframe type
  if (source.embedUrl && source.sourceType === 'iframe') {
    try {
      const res = await fetch(source.embedUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        errors.push(`Embed URL returned ${res.status}`)
        status = 'unavailable'
      }
    } catch (err) {
      errors.push(`Embed URL unreachable: ${err.message}`)
      status = 'unavailable'
    }
  }

  // 5. Check source format support
  if (source.sourceType === 'hls' && source.sourceUrl) {
    try {
      const res = await fetch(source.sourceUrl, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(10000),
      })
      const text = await res.text()
      if (!text.includes('#EXTM3U')) {
        errors.push('Source is not a valid HLS manifest')
        status = 'unavailable'
      }
      if (text.includes('#EXT-X-KEY')) {
        errors.push('Source is AES-encrypted HLS — may not play in browser')
        // Don't mark as unavailable — some encrypted sources still work
      }
    } catch (err) {
      errors.push(`HLS validation failed: ${err.message}`)
      status = 'unavailable'
    }
  }

  // 6. If no errors, mark as authorized
  if (errors.length === 0) {
    status = 'authorized'
  }

  return {
    valid: status === 'authorized',
    status,
    errors,
  }
}

/**
 * Validate a subtitle track.
 * Returns: { valid: boolean, status: string, errors: string[] }
 */
export async function validateSubtitleTrack(track) {
  const errors = []
  let status = 'pending_verification'

  // 1. Check format support
  if (!['vtt', 'srt'].includes(track.format)) {
    errors.push(`Unsupported subtitle format: ${track.format}`)
    status = 'unavailable'
    return { valid: false, status, errors }
  }

  // 2. Check encoding
  if (track.encoding && !['utf-8', 'utf8', 'iso-8859-1'].includes(track.encoding.toLowerCase())) {
    errors.push(`Unsupported encoding: ${track.encoding}`)
    status = 'unavailable'
    return { valid: false, status, errors }
  }

  // 3. Validate URL if provided
  if (track.sourceUrl) {
    try {
      const res = await fetch(track.sourceUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        errors.push(`Subtitle URL returned ${res.status}`)
        status = 'unavailable'
      }
    } catch (err) {
      errors.push(`Subtitle URL unreachable: ${err.message}`)
      status = 'unavailable'
    }
  }

  // 4. If no errors, mark as active
  if (errors.length === 0) {
    status = 'active'
  }

  return {
    valid: status === 'active',
    status,
    errors,
  }
}

/**
 * Batch validate multiple sources.
 */
export async function validateSources(sources) {
  const results = []
  for (const source of sources) {
    const result = await validateVideoSource(source)
    results.push({ source, ...result })
  }
  return results
}
