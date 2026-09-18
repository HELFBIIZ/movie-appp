// GET /api/cron/qpay — Vercel Cron replacement for the qpay-watcher daemon.
// Sweeps all PENDING QPay invoices, asks QPay if the money arrived, and flips
// any PAID row SUCCESSFUL server-side + notifies the buyer — same logic as
// scripts/qpay-watcher.mjs (which can't run on serverless).
//
// Guarded by CRON_SECRET: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
// automatically when a `cron` entry exists in vercel.json.
//   200 { ok, configured, checked, completed } · 401 UNAUTHORIZED
import { NextResponse } from 'next/server'
import {
  listPendingQpay, activatePaymentSuccess, getPlanById, createNotification,
} from '../../../../lib/db.mjs'
import { checkQpayInvoices, isQpayPaid } from '../../../../lib/qpay.mjs'

const SECRET = process.env.CRON_SECRET?.trim()

export async function GET(request) {
  const provided = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!SECRET || !provided || provided !== SECRET) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const pending = await listPendingQpay()
  if (!pending.length) return NextResponse.json({ ok: true, configured: true, checked: 0, completed: 0 })

  const ids = [...new Set(pending.map((p) => p.providerRef).filter(Boolean))]
  const check = await checkQpayInvoices(ids)
  if (!check) {
    return NextResponse.json({
      ok: true, configured: false, checked: pending.length, completed: 0,
      note: 'QPay gateway not configured (QPAY_INVOICE_AUTH missing).',
    })
  }
  if (check.error) {
    return NextResponse.json({ ok: true, configured: true, checked: pending.length, completed: 0, error: check.error })
  }

  let completed = 0
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
    completed++
  }

  return NextResponse.json({ ok: true, configured: true, checked: pending.length, completed })
}