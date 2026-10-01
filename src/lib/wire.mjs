// src/lib/wire.mjs — Wire.mn payment API client (server-only).
//
// Flow: create PaymentIntent → create checkout session → redirect user to pay.wire.mn
// Webhook verifies signature and activates subscription.
//
// Env:
//   WIRE_API_BASE      https://api.wire.mn
//   WIRE_SECRET_KEY    sk_live_...
//   WIRE_SIGNING_SECRET  whsec_... (webhook endpoint secret)
import crypto from 'crypto'

const env = (key) => process.env[key]?.trim()

function wireHeaders(idempotencyKey) {
  const h = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env('WIRE_SECRET_KEY')}`,
  }
  if (idempotencyKey) h['Idempotency-Key'] = idempotencyKey
  return h
}

/** Create a PaymentIntent on Wire.mn */
export async function createPaymentIntent({ amountMnt, description, reference, idempotencyKey }) {
  const base = env('WIRE_API_BASE')
  const key = env('WIRE_SECRET_KEY')
  if (!base || !key) return null

  try {
    const res = await fetch(`${base}/v1/payment_intents`, {
      method: 'POST',
      cache: 'no-store',
      headers: wireHeaders(idempotencyKey),
      body: JSON.stringify({
        currency: 'MNT',
        amount: amountMnt,
        description: String(description || '').slice(0, 500),
        metadata: reference ? { reference } : undefined,
      }),
    })
    if (!res.ok) {
      const body = (await res.text()).slice(0, 400)
      console.error(`[Wire] createPaymentIntent HTTP ${res.status}: ${body}`)
      return { error: { status: res.status, body } }
    }
    return await res.json()
  } catch (err) {
    const msg = String(err?.message || err)
    console.error(`[Wire] createPaymentIntent fetch failed: ${msg}`)
    return { error: { message: msg.slice(0, 200) } }
  }
}

/** Create a checkout session and return the hosted pay URL */
export async function createCheckoutSession({ paymentIntentId, successUrl, idempotencyKey }) {
  const base = env('WIRE_API_BASE')
  const key = env('WIRE_SECRET_KEY')
  if (!base || !key) return null

  try {
    const body = { payment_intent: paymentIntentId }
    if (successUrl) body.success_url = successUrl

    const res = await fetch(`${base}/v1/checkout/sessions`, {
      method: 'POST',
      cache: 'no-store',
      headers: wireHeaders(idempotencyKey),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = (await res.text()).slice(0, 400)
      console.error(`[Wire] createCheckoutSession HTTP ${res.status}: ${text}`)
      return { error: { status: res.status, body: text } }
    }
    return await res.json()
  } catch (err) {
    const msg = String(err?.message || err)
    console.error(`[Wire] createCheckoutSession fetch failed: ${msg}`)
    return { error: { message: msg.slice(0, 200) } }
  }
}

/**
 * Verify a Wire webhook signature.
 * Header format: WirePayment-Signature: t=<unix>,v1=<hex-hmac>
 * HMAC-SHA256(secret, "<t>.<rawBody>")
 */
export function verifyWireSignature(rawBody, signatureHeader, secret) {
  if (!rawBody || !signatureHeader || !secret) return false
  try {
    const parts = {}
    for (const part of signatureHeader.split(',')) {
      const [k, v] = part.split('=')
      if (k && v) parts[k.trim()] = v.trim()
    }
    const t = parts.t
    const v1 = parts.v1
    if (!t || !v1) return false

    const payload = `${t}.${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}`
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    if (expected.length !== v1.length) return false
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  } catch {
    return false
  }
}
