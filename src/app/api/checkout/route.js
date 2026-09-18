// POST /api/checkout — creates a payment order + Wire payment/invoice.
//
// provider:
//   wire        → Creates Wire payment/invoice (server-side only).
//                 Server calculates amount from plan. Client never sets price.
//                 Returns invoice URL for user to complete payment.
//   local_dev   → auto-activate (sandbox demo)
//   bank        → PENDING; admin confirms via /api/webhooks/bank
//   qpay        → (legacy) creates QPay invoice when configured
//
// Security:
//   • Payment amount is calculated server-side from plan data
//   • Client cannot manipulate price
//   • Wire credentials are server-side only
//   • Rate limited per user
//
// Returns:
//   200 { ok, payment:{txnId,status,amountMnt,provider}, wire?:{paymentId,invoiceUrl} }
//   401 UNAUTHENTICATED · 429 RATE_LIMITED · 404 UNKNOWN_PLAN · 400 INVALID_INPUT
import { NextResponse } from 'next/server'
import {
  requireUser, rateLimit, listSubscriptionPlans, createPayment,
  activatePaymentSuccess, logSecurity, setPaymentProviderRef,
} from '../../../lib/db.mjs'
import { parseJsonBody, reqStr, oneOf, badInput } from '../../../lib/validate.mjs'
import { createWirePayment, isWireConfigured } from '../../../lib/wire.mjs'
import { createQpayInvoice } from '../../../lib/qpay.mjs'

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireUser(token)
  if (error) return NextResponse.json({ error }, { status: error.status || 401 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const rl = rateLimit(`checkout:${user.id}`, { max: 10 })
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: rl.retryAfterSeconds } },
      { status: 429 }
    )
  }

  const body = await parseJsonBody(request)
  const planCode = reqStr(body?.planCode, { min: 2, max: 32, pattern: /^[A-Z][A-Z0-9_]*$/ })
  const provider = oneOf(body?.provider, ['wire', 'qpay', 'bank', 'local_dev'])
  if (!planCode.ok || !provider.ok) return badInput('planCode + provider required')

  const plan = (await listSubscriptionPlans()).find((p) => p.code === body.planCode)
  if (!plan) return NextResponse.json({ error: { code: 'UNKNOWN_PLAN' } }, { status: 404 })

  // Server-side price calculation — client cannot modify this
  const payment = await createPayment({
    userId: user.id, planId: plan.id, amountMnt: plan.priceMnt, provider: body.provider,
  })

  // ── local_dev: instant sandbox activation ──
  if (body.provider === 'local_dev') {
    const done = await activatePaymentSuccess(payment.txnId)
    if (done.error) return NextResponse.json({ error: done.error }, { status: 500 })
    await logSecurity({ userId: user.id, type: 'payment-verify', detail: `sandbox ${plan.code} (${payment.txnId})`, ip })
    return NextResponse.json({
      ok: true, sandbox: true,
      payment: done.payment, subscription: done.subscription,
    })
  }

  // ── bank transfer: pending admin confirmation ──
  if (body.provider === 'bank') {
    return NextResponse.json({
      ok: true, pending: true, payment,
      note: 'Transfer MNT via bank and the operator confirms via /api/webhooks/bank (admin).',
    })
  }

  // ── Wire payment: create invoice server-side ──
  if (body.provider === 'wire') {
    if (!isWireConfigured()) {
      return NextResponse.json({
        ok: true, pending: true, payment, wire: null,
        note: 'Wire gateway not configured — payment stays PENDING until credentials are set.',
      })
    }

    const wireResult = await createWirePayment({
      orderId: payment.txnId,
      amountMnt: plan.priceMnt,
      currency: 'MNT',
      planName: plan.name,
      description: `VXNTA ${plan.name} subscription`,
    })

    if (wireResult.error) {
      return NextResponse.json({
        ok: true, pending: true, payment, wire: null,
        note: `Wire payment request failed: ${wireResult.error.message || wireResult.error.status || 'unknown error'}`,
      })
    }

    // Store Wire payment ID on our payment row for reconciliation
    if (wireResult.paymentId) {
      await setPaymentProviderRef(payment.txnId, wireResult.paymentId)
    }

    return NextResponse.json({
      ok: true, pending: true, payment,
      wire: {
        paymentId: wireResult.paymentId,
        invoiceUrl: wireResult.invoiceUrl,
      },
    })
  }

  // ── QPay (legacy fallback) ──
  const invoice = await createQpayInvoice({
    txnId: payment.txnId, amountMnt: plan.priceMnt, description: plan.name,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/qpay`,
  })
  if (invoice && !invoice.error && invoice.invoiceId) await setPaymentProviderRef(payment.txnId, invoice.invoiceId)
  if (!invoice) {
    return NextResponse.json({
      ok: true, pending: true, payment, qpay: null,
      note: 'QPay gateway not configured — payment stays PENDING until a provider webhook.',
    })
  }
  if (invoice.error) {
    return NextResponse.json({
      ok: true, pending: true, payment, qpay: null,
      note: `QPay invoice request failed (${invoice.error.status || invoice.error.message}).`,
    })
  }
  return NextResponse.json({ ok: true, pending: true, payment, qpay: invoice })
}
