// src/lib/wire.mjs — Wire payment integration (server-only, env-gated).
//
// Security contract:
//   • This module is the ONLY place that calls the Wire API.
//   • No Wire secrets are ever serialized to the browser.
//   • Payment amounts are calculated server-side from plan data.
//   • Webhook signature is verified using HMAC-SHA256 with constant-time comparison.
//   • Duplicate webhook events are safely ignored via idempotency.
//
// Environment variables required:
//   WIRE_API_KEY          — Wire API key
//   WIRE_API_KEY_ID       — Wire API key ID
//   WIRE_WEBHOOK_SIGNING_SECRET — HMAC signing secret for webhook verification
//   NEXT_PUBLIC_APP_URL   — Base URL for callbacks

import crypto from 'crypto'

const WIRE_API_BASE = 'https://api.wire.com/v1'

function getConfig() {
  const apiKey = process.env.WIRE_API_KEY?.trim()
  const apiKeyId = process.env.WIRE_API_KEY_ID?.trim()
  const signingSecret = process.env.WIRE_WEBHOOK_SIGNING_SECRET?.trim()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'

  if (!apiKey || !apiKeyId) return null
  return { apiKey, apiKeyId, signingSecret, appUrl }
}

function wireHeaders(config) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
    'X-Wire-Key-Id': config.apiKeyId,
  }
}

// ─────────────────────────── CREATE PAYMENT / INVOICE ───────────────────────────

/**
 * Create a Wire payment/invoice for a subscription order.
 * Returns: { paymentId, invoiceUrl, status } or { error }
 *
 * The server calculates the amount from the plan — the client never sets the price.
 */
export async function createWirePayment({ orderId, amountMnt, currency = 'MNT', description, planName }) {
  const config = getConfig()
  if (!config) return { error: { code: 'WIRE_NOT_CONFIGURED', message: 'Wire API credentials not configured' } }

  const body = {
    order_id: orderId,
    amount: amountMnt,
    currency,
    description: description || `VXNTA subscription: ${planName || 'VIP'}`,
    callback_url: `${config.appUrl}/api/webhooks/wire`,
    metadata: {
      orderId,
      planName: planName || 'VIP',
    },
  }

  try {
    const res = await fetch(`${WIRE_API_BASE}/payments`, {
      method: 'POST',
      headers: wireHeaders(config),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { error: { status: res.status, body: text.slice(0, 500) } }
    }

    const data = await res.json()
    return {
      paymentId: data.payment_id || data.id || null,
      invoiceUrl: data.invoice_url || data.checkout_url || data.url || null,
      status: data.status || 'pending',
    }
  } catch (err) {
    return { error: { message: String(err?.message || err).slice(0, 300) } }
  }
}

// ─────────────────────────── CHECK PAYMENT STATUS ───────────────────────────

/**
 * Poll Wire for the real payment status.
 * Returns: { status, paidAt } or { error }
 */
export async function checkWirePaymentStatus(wirePaymentId) {
  const config = getConfig()
  if (!config) return { error: { code: 'WIRE_NOT_CONFIGURED' } }

  try {
    const res = await fetch(`${WIRE_API_BASE}/payments/${wirePaymentId}`, {
      method: 'GET',
      headers: wireHeaders(config),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return { error: { status: res.status } }
    }

    const data = await res.json()
    return {
      status: data.status, // pending | paid | failed | cancelled | expired
      paidAt: data.paid_at || null,
    }
  } catch (err) {
    return { error: { message: String(err?.message || err).slice(0, 300) } }
  }
}

// ─────────────────────────── WEBHOOK SIGNATURE VERIFICATION ───────────────────────────

/**
 * Verify Wire webhook signature using HMAC-SHA256.
 *
 * Wire sends: WirePayment-Signature: t=<unix>,v1=<hex>
 * Verification: HMAC-SHA256(signingSecret, timestamp + "." + rawBody)
 *
 * Requirements:
 *   • Use the RAW request body (not parsed JSON)
 *   • Extract timestamp and v1 signature
 *   • Reject timestamps older than 300 seconds
 *   • Use constant-time comparison
 *   • Reject invalid signatures
 */
export function verifyWireWebhookSignature(rawBody, signatureHeader) {
  const config = getConfig()
  if (!config?.signingSecret) {
    return { valid: false, reason: 'NO_SIGNING_SECRET' }
  }

  if (!signatureHeader) {
    return { valid: false, reason: 'NO_SIGNATURE' }
  }

  // Parse signature header: "t=<unix>,v1=<hex>"
  const parts = {}
  for (const part of signatureHeader.split(',')) {
    const [key, ...valueParts] = part.split('=')
    parts[key.trim()] = valueParts.join('=').trim()
  }

  const timestamp = parts.t
  const v1Signature = parts.v1

  if (!timestamp || !v1Signature) {
    return { valid: false, reason: 'INVALID_FORMAT' }
  }

  // Reject timestamps older than 300 seconds
  const now = Math.floor(Date.now() / 1000)
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    return { valid: false, reason: 'TIMESTAMP_EXPIRED' }
  }

  // Compute expected signature: HMAC-SHA256(secret, timestamp + "." + body)
  const payload = `${timestamp}.${rawBody}`
  const expected = crypto
    .createHmac('sha256', config.signingSecret)
    .update(payload, 'utf8')
    .digest('hex')

  // Constant-time comparison
  try {
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(v1Signature, 'hex')
    if (a.length !== b.length) return { valid: false, reason: 'SIGNATURE_MISMATCH' }
    const valid = crypto.timingSafeEqual(a, b)
    return valid ? { valid: true } : { valid: false, reason: 'SIGNATURE_MISMATCH' }
  } catch {
    return { valid: false, reason: 'INVALID_SIGNATURE' }
  }
}

// ─────────────────────────── IDEMPOTENCY HELPERS ───────────────────────────

/**
 * Check if a webhook event has already been processed.
 * Uses the WebhookEvent table via a callback function.
 */
export async function isEventAlreadyProcessed(eventId, checkFn) {
  try {
    const existing = await checkFn(eventId)
    return !!existing
  } catch {
    return false
  }
}

/**
 * Map Wire payment status to our internal status.
 */
export function mapWireStatus(wireStatus) {
  const statusMap = {
    pending: 'PENDING',
    processing: 'PROCESSING',
    paid: 'SUCCESSFUL',
    failed: 'FAILED',
    cancelled: 'CANCELLED',
    expired: 'EXPIRED',
    refunded: 'REFUNDED',
  }
  return statusMap[wireStatus] || 'PENDING'
}

// ─────────────────────────── CONFIG CHECK ───────────────────────────

export function isWireConfigured() {
  return !!getConfig()
}
