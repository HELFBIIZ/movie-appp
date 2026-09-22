// POST /api/webhooks/wire — Wire.mn webhook that activates VIP after payment.
// Verified by HMAC-SHA256 signature (WirePayment-Signature header).
//  200 { ok: true } · 400 BAD_SIGNATURE · 401 MISSING_SECRET · 404 UNKNOWN_TXN
import { NextResponse } from 'next/server'
import {
  activatePaymentSuccess, getPaymentByTxn, findPaymentByProviderRef,
  getPlanById, createNotification,
} from '../../../../lib/db.mjs'
import { verifyWireSignature } from '../../../../lib/wire.mjs'
import { logWebhookEvent, isWebhookEventProcessed } from '../../../../lib/db.mjs'

const SECRET = process.env.WIRE_SIGNING_SECRET?.trim()

export async function POST(request) {
  if (!SECRET) {
    console.error('[Wire webhook] WIRE_SIGNING_SECRET not configured')
    return NextResponse.json({ error: { code: 'MISSING_SECRET' } }, { status: 401 })
  }

  const rawBody = await request.text()
  const sig = request.headers.get('wirepayment-signature')

  if (!verifyWireSignature(rawBody, sig, SECRET)) {
    console.error('[Wire webhook] Signature verification failed')
    return NextResponse.json({ error: { code: 'BAD_SIGNATURE' } }, { status: 400 })
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON' } }, { status: 400 })
  }

  const eventType = event.type || event.event_type
  const eventId = event.id

  // Idempotency: skip already-processed events
  if (eventId && await isWebhookEventProcessed(eventId)) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  if (eventType !== 'payment_intent.succeeded') {
    return NextResponse.json({ ok: true, skipped: eventType })
  }

  const pi = event.data?.object || event.payment_intent || event
  const piId = pi.id
  const metadata = pi.metadata || {}
  const reference = metadata.reference

  // Find payment: try txnId (reference), then provider_ref (pi.id)
  let payment = reference ? await getPaymentByTxn(reference) : null
  if (!payment && piId) payment = await findPaymentByProviderRef(piId)
  if (!payment) {
    console.error(`[Wire webhook] No payment found for pi=${piId} ref=${reference}`)
    return NextResponse.json({ error: { code: 'UNKNOWN_TXN' } }, { status: 404 })
  }

  const result = await activatePaymentSuccess(payment.txnId)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 409 })

  const freshPayment = result.payment || await getPaymentByTxn(payment.txnId)
  if (!result.alreadyActivated && freshPayment) {
    const plan = await getPlanById(freshPayment.planId)
    await createNotification({
      userId: freshPayment.userId, type: 'payment_approved',
      title: '✅ Төлбөр баталгаажлаа',
      body: plan
        ? `Wire төлбөр орлоо: VIP +${plan.durationDays} хоног идэвхжлээ (${plan.code}).`
        : 'Wire төлбөр орлоо: VIP гишүүнчлэл идэвхжлээ.',
      link: '/pricing',
    })
  }

  // Log the webhook event for idempotency
  if (eventId) {
    await logWebhookEvent({ id: eventId, provider: 'wire', type: eventType, payload: pi })
  }

  return NextResponse.json({ ok: true, payment: result.payment, subscription: result.subscription })
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'wire' })
}
