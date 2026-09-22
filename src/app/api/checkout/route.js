// POST /api/checkout — creates a payment row + (sandbox) instant activation.
//
// provider:
//   local_dev  → auto-activate (product demo / end-to-end without a merchant cred)
//   bank       → PENDING; admin confirms the transfer via /api/webhooks/bank
//   qpay       → PENDING; creates a QPay invoice when QPAY_* env is configured,
//                otherwise stays PENDING awaiting a provider webhook. Never fake-approved.
//
// Returns:
//   200 { ok, payment:{txnId,status,amountMnt,provider}, subscription? }
//   401 UNAUTHENTICATED · 429 RATE_LIMITED · 404 UNKNOWN_PLAN · 400 INVALID_INPUT
import { NextResponse } from 'next/server'
import {
  requireUser, rateLimit, listSubscriptionPlans, createPayment,
  activatePaymentSuccess, logSecurity, setPaymentProviderRef,
} from '../../../lib/db.mjs'
import { parseJsonBody, reqStr, oneOf, badInput } from '../../../lib/validate.mjs'
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
  const provider = oneOf(body?.provider, ['qpay', 'bank', 'local_dev'])
  if (!planCode.ok || !provider.ok) return badInput('planCode + provider required')

  const plan = (await listSubscriptionPlans()).find((p) => p.code === body.planCode)
  if (!plan) return NextResponse.json({ error: { code: 'UNKNOWN_PLAN' } }, { status: 404 })

  const payment = await createPayment({
    userId: user.id, planId: plan.id, amountMnt: plan.priceMnt, provider: body.provider,
  })

  if (body.provider === 'local_dev') {
    const done = await activatePaymentSuccess(payment.txnId)
    if (done.error) return NextResponse.json({ error: done.error }, { status: 500 })
    await logSecurity({ userId: user.id, type: 'payment-verify', detail: `sandbox ${plan.code} (${payment.txnId})`, ip })
    return NextResponse.json({
      ok: true, sandbox: true,
      payment: done.payment, subscription: done.subscription,
    })
  }

  if (body.provider === 'bank') {
    return NextResponse.json({
      ok: true, pending: true, payment,
      note: 'Transfer MNT via bank and the operator confirms via /api/webhooks/bank (admin).',
    })
  }

  // qpay — create the invoice and stash its id on the PENDING row for reconciliation.
  const invoice = await createQpayInvoice({
    txnId: payment.txnId, amountMnt: plan.priceMnt, description: plan.name,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/qpay`,
  })
  if (invoice && !invoice.error && invoice.invoiceId) await setPaymentProviderRef(payment.txnId, invoice.invoiceId)
  if (!invoice) {
    return NextResponse.json({
      ok: true, pending: true, payment, qpay: null,
      note: 'QPay gateway not configured — set QPAY_INVOICE_URL and QPAY_INVOICE_AUTH in Vercel env.',
    })
  }
  if (invoice.error) {
    return NextResponse.json({
      ok: true, pending: true, payment, qpay: null,
      note: `QPay error: ${invoice.error.message || invoice.error.body || `HTTP ${invoice.error.status}`}`,
    })
  }
  return NextResponse.json({ ok: true, pending: true, payment, qpay: invoice })
}