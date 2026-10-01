// POST /api/webhooks/qpay — QPay callback that flips a PENDING payment to
// SUCCESSFUL and materialises the subscription. Verified by a shared secret
// (QPAY_CALLBACK_TOKEN in `x-qpay-signature`, or `?token=` for sandbox).
// Replay-safe via activatePaymentSuccess (a SUCCESSFUL txn is a no-op).
//  200 { action:'updated' } · 401 UNAUTHORIZED · 404 UNKNOWN_TXN · 503 GATEWAY_NOT_CONFIGURED
import { NextResponse } from 'next/server'
import {
  activatePaymentSuccess, getPaymentByTxn, findPaymentByProviderRef,
  getPlanById, createNotification,
} from '../../../../lib/db.mjs'
import { parseJsonBody } from '../../../../lib/validate.mjs'
import { verifyQpayToken } from '../../../../lib/qpay.mjs'

const SECRET = process.env.QPAY_CALLBACK_TOKEN?.trim()

export async function POST(request) {
  if (!SECRET) {
    return NextResponse.json({ error: { code: 'GATEWAY_NOT_CONFIGURED' } }, { status: 503 })
  }
  const provided = request.headers.get('x-qpay-signature') || request.nextUrl.searchParams.get('token')
  if (!verifyQpayToken(provided, SECRET)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const body = await parseJsonBody(request)
  // QPay echoes invoice_no + invoice_id; either reconciles to our payment row.
  const payment =
    (body?.invoice_no || body?.txnId) ? await getPaymentByTxn(body.invoice_no || body.txnId) : null ||
    (body?.invoice_id ? await findPaymentByProviderRef(body.invoice_id) : null)
  if (!payment) return NextResponse.json({ error: { code: 'UNKNOWN_TXN' } }, { status: 404 })

  const result = await activatePaymentSuccess(payment.txnId)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 409 })
  const freshPayment = result.payment || await getPaymentByTxn(payment.txnId)
  if (!result.alreadyActivated && freshPayment) {
    const plan = await getPlanById(freshPayment.planId)
    await createNotification({
      userId: freshPayment.userId, type: 'payment_approved',
      title: '✅ Төлбөр баталгаажлаа',
      body: plan
        ? `QPay төлбөр орлоо: VIP +${plan.durationDays} хоног идэвхжлээ (${plan.code}).`
        : 'QPay төлбөр орлоо: VIP гишүүнчлэл идэвхжлээ.',
      link: '/pricing',
    })
  }
  return NextResponse.json({ action: 'updated', payment: result.payment, subscription: result.subscription })
}