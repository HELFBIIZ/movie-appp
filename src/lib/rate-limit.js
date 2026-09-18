// src/lib/rate-limit.js — In-memory rate limiter for API routes.
//
// Uses a sliding window counter per key. Not distributed — suitable for
// single-instance deployments (Vercel serverless, single server).
// For multi-instance, use Redis-backed rate limiting.

const store = new Map()
const CLEANUP_INTERVAL = 60 * 1000 // 1 minute

// Auto-cleanup stale entries
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now - entry.windowStart > entry.windowMs * 2) {
      store.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

/**
 * Check rate limit for a key.
 * @param {string} key - Unique identifier (e.g., "checkout:userId", "login:ip")
 * @param {object} opts - { max: max requests, windowMs: window in ms }
 * @returns { { limited: boolean, remaining: number, retryAfterSeconds: number } }
 */
export function rateLimit(key, { max = 60, windowMs = 60_000 } = {}) {
  const now = Date.now()
  let entry = store.get(key)

  if (!entry || now - entry.windowStart > windowMs) {
    entry = { windowStart: now, count: 0, windowMs }
    store.set(key, entry)
  }

  entry.count++

  const remaining = Math.max(0, max - entry.count)
  const limited = entry.count > max
  const retryAfterSeconds = limited ? Math.ceil((entry.windowStart + windowMs - now) / 1000) : 0

  return { limited, remaining, retryAfterSeconds }
}

/**
 * Middleware helper for Next.js API routes.
 * Returns null if allowed, or NextResponse with 429 if rate limited.
 */
export function rateLimitMiddleware(key, opts) {
  const rl = rateLimit(key, opts)
  if (!rl.limited) return null
  return {
    status: 429,
    body: {
      error: {
        code: 'RATE_LIMITED',
        retryAfterSeconds: rl.retryAfterSeconds,
        remaining: rl.remaining,
      },
    },
  }
}
