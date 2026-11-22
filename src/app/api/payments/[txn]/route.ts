import { NextRequest, NextResponse } from 'next/server';
import { requireUser, rateLimit, getPaymentByTxn, getActiveSubscription } from '@/db/index.mjs';
import { reconcileWirePayment } from '@/lib/wire-fulfill.mjs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ txn: string }> }) {
  const { user, error } = await requireUser(request.cookies.get('mn_session')?.value);
  if (error) return NextResponse.json({ error }, { status: 401 });
  if (rateLimit(`payment-status:${user.id}`, { max: 50, windowMs: 180_000 }).limited)
    return NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 });
  const { txn } = await params;
  const payment = /^tx_[a-f0-9-]{36}$/.test(txn) ? await getPaymentByTxn(txn) : null;
  if (!payment || payment.userId !== user.id)
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  const result = payment.provider === 'wire' ? await reconcileWirePayment(payment) : { payment };
  if ('error' in result && result.error)
    return NextResponse.json({ error: result.error }, { status: 502 });
  const fresh = result.payment ?? payment;
  return NextResponse.json(
    {
      payment: {
        txnId: fresh.txnId,
        status: fresh.status,
        amountMnt: fresh.amountMnt,
        provider: fresh.provider,
      },
      subscription: fresh.status === 'SUCCESSFUL' ? await getActiveSubscription(user.id) : null,
      gatewayStatus: 'gatewayStatus' in result ? result.gatewayStatus : undefined,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
