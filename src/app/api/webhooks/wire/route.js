import { NextResponse } from 'next/server';
import { findPaymentByProviderRef, logWebhookEvent } from '@/db/index.mjs';
import { verifyWireSignature, webhookIntent } from '@/lib/wire.mjs';
import { reconcileWirePayment } from '@/lib/wire-fulfill.mjs';

export async function POST(request) {
  const secret = process.env.WIRE_SIGNING_SECRET?.trim() || process.env.WIRE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: { code: 'MISSING_SECRET' } }, { status: 503 });
  const rawBody = await request.text();
  if (
    rawBody.length > 250_000 ||
    !verifyWireSignature(rawBody, request.headers.get('wirepayment-signature'), secret)
  )
    return NextResponse.json({ error: { code: 'BAD_SIGNATURE' } }, { status: 400 });
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON' } }, { status: 400 });
  }
  if (event.type !== 'payment_intent.succeeded')
    return NextResponse.json({ ok: true, skipped: true });
  const intent = webhookIntent(event);
  if (!intent || intent.status !== 'succeeded')
    return NextResponse.json({ error: { code: 'INVALID_EVENT' } }, { status: 400 });
  const payment = await findPaymentByProviderRef(intent.id);
  if (!payment || payment.provider !== 'wire')
    return NextResponse.json({ error: { code: 'UNKNOWN_TXN' } }, { status: 404 });
  const result = await reconcileWirePayment(payment);
  if (result.error || result.pending)
    return NextResponse.json(
      { error: result.error || { code: 'PAYMENT_NOT_CONFIRMED' } },
      { status: result.error?.code === 'WIRE_PAYMENT_MISMATCH' ? 409 : 503 },
    );
  if (typeof event.id === 'string' && event.id.length < 200)
    await logWebhookEvent({
      id: event.id,
      provider: 'wire',
      type: event.type,
      payload: { intentId: intent.id, status: 'succeeded' },
    });
  return NextResponse.json({ ok: true, duplicate: Boolean(result.alreadyActivated) });
}
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'wire' });
}
