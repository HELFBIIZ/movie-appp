// POST /api/webhooks/bank — operator confirms a bank-transfer deposit and flips
// the matching PENDING payment to SUCCESSFUL. Admin-only (session role gate).
// Idempotent: replaying the same txn is a no-op.
//  200 { ok, payment, subscription } · 401/403 UNAUTHENTICATED/FORBIDDEN · 404 UNKNOWN_TXN
import { NextResponse } from 'next/server'
import { requireRole, activatePaymentSuccess } from '../../../../lib/db.mjs'
import { parseJsonBody, reqStr } from '../../../../lib/validate.mjs'

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value
  const { user, error } = await requireRole(token, 'ADMIN', 'SUPER_ADMIN')
  if (error) return NextResponse.json({ error }, { status: error.status || 401 })

  const body = await parseJsonBody(request)
  const txn = reqStr(body?.txnId, { min: 4, max: 64, pattern: /^tx_[a-zA-Z0-9-]+$|^tx_[a-f0-9-]+$/i })
  if (!txn.ok) return NextResponse.json({ error: { code: 'INVALID_INPUT', field: 'txnId' } }, { status: 400 })

  const result = await activatePaymentSuccess(body.txnId)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 })
  return NextResponse.json({ ok: true, payment: result.payment, subscription: result.subscription })
}