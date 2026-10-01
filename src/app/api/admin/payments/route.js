// /api/admin/payments — manual Khan Bank receipt review, ADMIN/SUPER_ADMIN only.
//   GET  ?status=PENDING|APPROVED|REJECTED (default PENDING) → listed receipts
//   POST { action:'approve'|'reject', txnId, adminNote? }
//        approve → activatePaymentSuccess (VIP expiry stacked + extended)
//        reject  → payment FAILED, receipt REJECTED
//   401/403 UNAUTHENTICATED/FORBIDDEN · 400 INVALID_INPUT · 404 UNKNOWN_TXN
import { NextResponse } from 'next/server'
import {
  requireRole, listReceipts, activatePaymentSuccess, rejectPayment, updateReceiptStatus,
  getPaymentByTxn, getPlanById, createNotification,
} from '../../../../lib/db.mjs'
import { parseJsonBody, reqStr, optStr, oneOf, all, badInput } from '../../../../lib/validate.mjs'

export async function GET(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireRole(token, 'ADMIN', 'SUPER_ADMIN')
  if (error) return NextResponse.json({ error }, { status: error.status || 401 })

  const status = request.nextUrl.searchParams.get('status') || 'PENDING'
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
    return badInput('status must be PENDING|APPROVED|REJECTED', 'status')
  }
  return NextResponse.json({ ok: true, status, receipts: await listReceipts({ status }) })
}

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireRole(token, 'ADMIN', 'SUPER_ADMIN')
  if (error) return NextResponse.json({ error }, { status: error.status || 401 })

  const body = await parseJsonBody(request)
  const action = oneOf(body?.action, ['approve', 'reject'])
  const txn = reqStr(body?.txnId, { min: 4, max: 64, pattern: /^tx_[a-zA-Z0-9-]+$|^tx_[a-f0-9-]+$/i })
  const note = optStr(body?.adminNote, { max: 280 })
  const check = all(action, txn, note)
  if (check.error) return badInput('action + txnId required', check.error.field)

  if (body.action === 'approve') {
    const result = await activatePaymentSuccess(body.txnId)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.error.status ?? 404 })
    const receipt = await updateReceiptStatus({
      txnId: body.txnId, status: 'APPROVED', adminNote: note.value, reviewedBy: user.id,
    })
    const payment = result.payment || await getPaymentByTxn(body.txnId)
    const plan = payment ? await getPlanById(payment.planId) : null
    await createNotification({
      userId: payment.userId, type: 'payment_approved',
      title: '✅ Төлбөр баталгаажлаа',
      body: plan
        ? `VIP +${plan.durationDays} хоног идэвхжлээ (${plan.code}). Та үзэх боломжтой боллоо!`
        : 'VIP гишүүнчлэл идэвхжлээ.',
      link: '/pricing',
    })
    return NextResponse.json({ ok: true, payment: result.payment, subscription: result.subscription, receipt })
  }

  // reject
  await rejectPayment(body.txnId)
  const receipt = await updateReceiptStatus({
    txnId: body.txnId, status: 'REJECTED', adminNote: note.value, reviewedBy: user.id,
  })
  const payment = await getPaymentByTxn(body.txnId)
  await createNotification({
    userId: payment.userId, type: 'payment_rejected',
    title: '⚠️ Төлбөр баталгаажаагүй',
    body: note.value
      ? `Шалтгаан: ${note.value}. Тусламж: /help хуудас эсвэл hello@vxnta.app`
      : 'Баримтыг шалгаж чадсангүй. /help хуудас эсвэл hello@vxnta.app-т холбогдоно уу.',
    link: '/pricing',
  })
  return NextResponse.json({ ok: true, receipt, note: 'Receipt rejected; payment marked FAILED.' })
}