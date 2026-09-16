// GET /api/qpay/status?txnId=… — the payer-side live check. The pricing page
// polls this while a QPay invoice is up; when QPay reports PAID, the payment is
// completed server-side here and the buyer gets a "payment received" bell
// notification — NO admin, NO manual step. Owner-guarded.
//
//   200 { configured, status, payment?, subscription?, notified? }
//   401 UNAUTHENTICATED · 403 FORBIDDEN (not your txn) · 404 UNKNOWN_TXN
import { NextResponse } from 'next/server'
import {
  requireUser, getPaymentByTxn, listUserPendingQpay, activatePaymentSuccess,
  getPlanById, createNotification,
} from '../../../../lib/db.mjs'
import { checkQpayInvoices, isQpayPaid } from '../../../../lib/qpay.mjs'

export async function GET(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireUser(token)
  if (error) return NextResponse.json({ error }, { status: error.status || 401 })

  const txnId = (request.nextUrl.searchParams.get('txnId') || '').trim()
  const payment = txnId ? await getPaymentByTxn(txnId) : null
  if (txnId && !payment) {
    return NextResponse.json({ error: { code: 'UNKNOWN_TXN' } }, { status: 404 })
  }

  // No txnId → check all of the user's live QPay invoices (page just loaded).
  const pending = payment
    ? [payment].filter((p) => p.provider === 'qpay' && p.status === 'PENDING' && p.providerRef)
    : await listUserPendingQpay(user.id)
  if (!pending.length) {
    if (payment) {
      if (payment.userId !== user.id && user.roleCode !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
      }
      return NextResponse.json({
        configured: false, status: payment.status, payment,
        note: 'No live QPay invoice to check.',
      })
    }
    return NextResponse.json({ configured: false, status: 'NONE' })
  }
  if (pending.some((p) => p.userId !== undefined && p.userId !== user.id)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
  }

  const invoiceIds = pending.map((p) => p.providerRef)
  const check = await checkQpayInvoices(invoiceIds)
  if (!check) {
    return NextResponse.json({
      configured: false, status: 'PENDING',
      note: 'QPay gateway not configured — complete the transfer and an operator will verify it.',
    })
  }
  if (check.error) {
    return NextResponse.json({ configured: true, status: 'POLL_ERROR', detail: check.error })
  }

  let completed = null
  for (const row of check.rows || []) {
    if (!isQpayPaid(row)) continue
    const match = pending.find((p) => p.providerRef === row.invoice_id)
    if (!match) continue
    const result = await activatePaymentSuccess(match.txnId)
    if (result.error || result.alreadyActivated) continue
    const plan = await getPlanById(result.payment.planId)
    await createNotification({
      userId: result.payment.userId, type: 'payment_approved',
      title: '✅ Төлбөр баталгаажлаа',
      body: plan
        ? `QPay төлбөр орлоо: VIP +${plan.durationDays} хоног идэвхжлээ (${plan.code}).`
        : 'QPay төлбөр орлоо: VIP гишүүнчлэл идэвхжлээ.',
      link: '/pricing',
    })
    completed = result
  }

  return NextResponse.json({
    configured: true,
    status: completed ? 'SUCCESSFUL' : 'PENDING',
    payment: completed ? completed.payment : payment,
    subscription: completed ? completed.subscription : null,
  })
}