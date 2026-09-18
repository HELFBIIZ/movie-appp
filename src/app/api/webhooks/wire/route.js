// POST /api/webhooks/wire — Wire payment webhook handler.
//
// Security requirements:
//   • Use the RAW request body for signature verification
//   • Verify HMAC-SHA256 signature
//   • Reject timestamps older than 300 seconds
//   • Use constant-time comparison
//   • Implement idempotency (never process same event twice)
//   • Never expose signing secret
//   • Never log secrets
//
// Wire sends:
//   WirePayment-Signature: t=<unix>,v1=<hex>
//
// Flow:
//   1. Read raw body
//   2. Verify signature
//   3. Check idempotency (WebhookEvent table)
//   4. Parse event type
//   5. Update payment status
//   6. Grant subscription access (only after verified payment)
//   7. Return 2xx response
//
// Handles:
//   • payment.paid → SUCCESSFUL + activate subscription
//   • payment.failed → FAILED
//   • payment.cancelled → CANCELLED
//   • payment.expired → EXPIRED
//   • endpoint.verification → Return 2xx for Wire verification

import { NextResponse } from 'next/server'
import { verifyWireWebhookSignature, mapWireStatus } from '../../../../lib/wire.mjs'

// Raw body reader — critical for signature verification
async function readRawBody(request) {
  const reader = request.body.getReader()
  const chunks = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const decoder = new TextDecoder('utf-8')
  return decoder.decode(Buffer.concat(chunks))
}

export async function POST(request) {
  // 1. Read raw body (MUST be raw for signature verification)
  let rawBody
  try {
    rawBody = await readRawBody(request)
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_BODY' } }, { status: 400 })
  }

  // 2. Get signature header
  const signatureHeader = request.headers.get('wirepayment-signature') ||
                          request.headers.get('x-wire-signature')

  // 3. Verify signature
  const verification = verifyWireWebhookSignature(rawBody, signatureHeader)
  if (!verification.valid) {
    console.error('[Wire Webhook] Signature verification failed:', verification.reason)
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', reason: verification.reason } }, { status: 401 })
  }

  // 4. Parse body
  let body
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON' } }, { status: 400 })
  }

  const eventType = body.type || body.event_type || 'unknown'
  const eventId = body.id || body.event_id || `wire_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // 5. Handle endpoint.verification (Wire verification handshake)
  if (eventType === 'endpoint.verification') {
    return NextResponse.json({ received: true })
  }

  // 6. Idempotency check + processing
  try {
    // Import db functions — use named imports
    const db = await import('../../../../lib/db.mjs')

    // Check if event already processed
    const existing = await db.qOne(
      'SELECT id FROM webhook_events WHERE provider = $1 AND event_id = $2 LIMIT 1',
      ['wire', eventId]
    )
    if (existing) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Store raw event (before processing)
    await db.qRun(
      `INSERT INTO webhook_events (provider, event_id, event_type, payload, signature, processed)
       VALUES ($1, $2, $3, $4, $5, false)`,
      ['wire', eventId, eventType, JSON.stringify(body), signatureHeader]
    )

    // 7. Process event by type
    const paymentId = body.payment_id || body.payment?.id || body.data?.payment_id || null
    const wireStatus = body.payment?.status || body.data?.status || body.status || null

    if (!paymentId && eventType !== 'endpoint.verification') {
      console.warn('[Wire Webhook] No payment ID in event:', eventType)
      return NextResponse.json({ received: true })
    }

    if (eventType === 'payment.paid' || wireStatus === 'paid') {
      const payment = await db.findPaymentByProviderRef(paymentId)
      if (payment) {
        const result = await db.activatePaymentSuccess(payment.txnId)
        if (!result.error && !result.alreadyActivated) {
          const plan = await db.getPlanById(payment.planId)
          await db.createNotification({
            userId: payment.userId,
            type: 'payment_approved',
            title: '✅ Төлбөр баталгаажлаа',
            body: plan
              ? `Wire төлбөр орлоо: VIP +${plan.durationDays} хоног идэвхжлээ (${plan.code}).`
              : 'Wire төлбөр орлоо: VIP гишүүнчлэл идэвхжлээ.',
            link: '/pricing',
          })
        }
      }
    } else if (eventType === 'payment.failed' || wireStatus === 'failed') {
      const payment = await db.findPaymentByProviderRef(paymentId)
      if (payment) {
        await db.qRun(
          'UPDATE payments SET status = $1, failure_reason = $2, updated_at = now() WHERE txn_id = $3',
          ['FAILED', body.failure_reason || 'Payment failed', payment.txnId]
        )
      }
    } else if (eventType === 'payment.cancelled' || wireStatus === 'cancelled') {
      const payment = await db.findPaymentByProviderRef(paymentId)
      if (payment) {
        await db.qRun(
          'UPDATE payments SET status = $1, updated_at = now() WHERE txn_id = $2',
          ['CANCELLED', payment.txnId]
        )
      }
    } else if (eventType === 'payment.expired' || wireStatus === 'expired') {
      const payment = await db.findPaymentByProviderRef(paymentId)
      if (payment) {
        await db.qRun(
          'UPDATE payments SET status = $1, updated_at = now() WHERE txn_id = $2',
          ['EXPIRED', payment.txnId]
        )
      }
    }

    // Mark event as processed
    await db.qRun(
      'UPDATE webhook_events SET processed = true, processed_at = now(), payment_id = $1 WHERE provider = $2 AND event_id = $3',
      [paymentId, 'wire', eventId]
    )
  } catch (err) {
    console.error('[Wire Webhook] Processing error:', err.message)

    // Return 500 so Wire retries
    return NextResponse.json({ error: { code: 'PROCESSING_ERROR' } }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
