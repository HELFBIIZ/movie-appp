// POST /api/payments/manual — user submits a Khan Bank transfer for a paid
// plan: required phone + planCode, optional note + screenshot (data:image/*).
// Creates a PENDING bank payment + a PENDING receipt row. An ADMIN approves the
// receipt via /api/admin/payments → activatePaymentSuccess (auto-extend VIP).
//
//   200 { ok, pending, payment, account, receipt }
//   401 UNAUTHENTICATED · 429 RATE_LIMITED · 404 UNKNOWN_PLAN · 400 INVALID_INPUT
import { NextResponse } from 'next/server'
import {
  requireUser, rateLimit, listSubscriptionPlans, createPayment, createManualReceipt,
  createNotification, listAdminUserIds,
} from '../../../../lib/db.mjs'
import { parseJsonBody, reqStr, optStr, all, badInput } from '../../../../lib/validate.mjs'

export const KHAN_BANK_ACCOUNT = Object.freeze({
  name: 'Taivanbaatar',
  number: 'MN550005005771031864',
  bank: 'Khan Bank',
})

const SCREENSHOT_MAX = 1_500_000 // ~1.5 MB decoded

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireUser(token)
  if (error) return NextResponse.json({ error }, { status: error.status || 401 })

  const rl = rateLimit(`manual:${user.id}`, { max: 5 })
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: rl.retryAfterSeconds } },
      { status: 429 }
    )
  }

  const body = await parseJsonBody(request)
  const planCode = reqStr(body?.planCode, { min: 4, max: 16, pattern: /^[A-Z][A-Z0-9_]*$/ })
  const phone = reqStr(body?.phone, { min: 7, max: 16, pattern: /^[+]?[0-9][0-9()\s-]{6,15}$/ })
  const note = optStr(body?.note, { max: 280 })
  const image = optStr(body?.imageData ?? '', { max: SCREENSHOT_MAX * 2 }) // base64 ~1.33x decoded
  const check = all(planCode, phone, note, image)
  if (check.error) return badInput('planCode, phone, note and imageData must be valid', check.error.field)

  if (image.value && !/^data:image\/(png|jpe?g|webp);base64,/.test(image.value)) {
    return badInput('imageData must be a data:image/png|jpeg|webp;base64,… URI', 'imageData')
  }
  if (image.value) {
    const approxBytes = Math.floor((image.value.length - image.value.indexOf(',') - 1) * 3 / 4)
    if (approxBytes > SCREENSHOT_MAX) return badInput('Screenshot exceeds 1.5 MB', 'imageData')
  }

  const plan = (await listSubscriptionPlans()).find((p) => p.code === body.planCode)
  if (!plan) return NextResponse.json({ error: { code: 'UNKNOWN_PLAN' } }, { status: 404 })

  const payment = await createPayment({
    userId: user.id, planId: plan.id, amountMnt: plan.priceMnt, provider: 'bank',
  })
  const receipt = await createManualReceipt({
    txnId: payment.txnId, userId: user.id,
    phone: phone.value, note: note.value, imageData: image.value,
  })

  const moneyLine = `${plan.code} • ${plan.priceMnt.toLocaleString('en-US')}₮ • ${phone.value}`
  const adminIds = await listAdminUserIds()
  await Promise.all(adminIds.map((adminId) =>
    createNotification({
      userId: adminId, type: 'payment_received',
      title: '🆕 Төлбөр хүлээгдэж байна',
      body: `${user.username || user.email}: ${moneyLine}`,
      link: '/admin/payments',
    })
  ))

  return NextResponse.json({
    ok: true,
    pending: true,
    payment,
    account: KHAN_BANK_ACCOUNT,
    receipt: { txnId: receipt.txnId, status: receipt.status },
    note: 'Transfer MNT to the Khan Bank account above, then an admin approves your VIP activation.',
  })
}