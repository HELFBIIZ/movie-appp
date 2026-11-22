// POST /api/checkout — server-priced checkout; verified settlement grants VIP.
//
// provider:
//   local_dev  → development only; rejected in production before payment creation
//   bank       → PENDING; admin confirms the transfer via /api/webhooks/bank
//   qpay       → PENDING; creates a QPay invoice when QPAY_* env is configured
//   wire       → PENDING; creates a Wire.mn PaymentIntent + checkout session
//
// Returns:
//   200 { ok, payment:{txnId,status,amountMnt,provider}, subscription? }
//   401 UNAUTHENTICATED · 429 RATE_LIMITED · 404 UNKNOWN_PLAN · 400 INVALID_INPUT
import { NextResponse } from 'next/server';
import {
  requireUser,
  rateLimit,
  listSubscriptionPlans,
  createPayment,
  activatePaymentSuccess,
  logSecurity,
  setPaymentProviderRef,
  getDb,
  getPaymentByTxn,
} from '../../../db/index.mjs';
import { parseJsonBody, reqStr, oneOf, badInput } from '../../../lib/validate';
import { createQpayInvoice } from '../../../lib/qpay.mjs';
import {
  createPaymentIntent,
  createCheckoutSession,
  hostedCheckoutUrl,
  wireConfigured,
} from '../../../lib/wire.mjs';
import { checkoutRequest, saveCheckoutUrl } from '../../../db/payment-fulfillment.mjs';
import { safeReturnTo } from '../../../lib/safe-return';

export async function POST(request) {
  const token = request.cookies.get('mn_session')?.value;
  const { user, error } = await requireUser(token);
  if (error) return NextResponse.json({ error }, { status: error.status || 401 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const rl = rateLimit(`checkout:${user.id}`, { max: 10 });
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', retryAfterSeconds: rl.retryAfterSeconds } },
      { status: 429 },
    );
  }

  const body = await parseJsonBody(request);
  const planCode = reqStr(body?.planCode, { min: 2, max: 32, pattern: /^[A-Z][A-Z0-9_]*$/ });
  const provider = oneOf(body?.provider, ['qpay', 'bank', 'local_dev', 'wire']);
  if (!planCode.ok || !provider.ok) return badInput('planCode + provider required');
  if (body.provider === 'local_dev' && process.env.NODE_ENV === 'production')
    return NextResponse.json({ error: { code: 'DEMO_DISABLED' } }, { status: 403 });
  if (body.provider === 'wire' && !wireConfigured())
    return NextResponse.json({ error: { code: 'WIRE_NOT_CONFIGURED' } }, { status: 503 });

  const plan = (await listSubscriptionPlans()).find((p) => p.code === body.planCode);
  if (!plan) return NextResponse.json({ error: { code: 'UNKNOWN_PLAN' } }, { status: 404 });

  let wireRequest;
  if (body.provider === 'wire') {
    const requestKey = request.headers.get('idempotency-key');
    if (!requestKey || !/^[a-zA-Z0-9_-]{16,100}$/.test(requestKey))
      return badInput('Idempotency-Key required');
    wireRequest = await checkoutRequest(await getDb(), {
      userId: user.id,
      requestKey,
      planId: plan.id,
      amountMnt: plan.priceMnt,
      provider: 'wire',
      returnTo: safeReturnTo(body.returnTo),
    });
    if (wireRequest.error) return NextResponse.json({ error: wireRequest.error }, { status: 409 });
  }
  const payment = wireRequest
    ? await getPaymentByTxn(wireRequest.txnId)
    : await createPayment({
        userId: user.id,
        planId: plan.id,
        amountMnt: plan.priceMnt,
        provider: body.provider,
      });

  if (body.provider === 'local_dev') {
    const done = await activatePaymentSuccess(payment.txnId);
    if (done.error) return NextResponse.json({ error: done.error }, { status: 500 });
    await logSecurity({
      userId: user.id,
      type: 'payment-verify',
      detail: `sandbox ${plan.code} (${payment.txnId})`,
      ip,
    });
    return NextResponse.json({
      ok: true,
      sandbox: true,
      payment: done.payment,
      subscription: done.subscription,
    });
  }

  if (body.provider === 'bank') {
    return NextResponse.json({
      ok: true,
      pending: true,
      payment,
      note: 'Transfer MNT via bank and the operator confirms via /api/webhooks/bank (admin).',
    });
  }

  if (body.provider === 'wire') {
    if (payment.status === 'SUCCESSFUL') return NextResponse.json({ ok: true, payment });
    if (!['PENDING', 'PROCESSING'].includes(payment.status))
      return NextResponse.json({ error: { code: 'PAYMENT_CLOSED' } }, { status: 409 });
    if (wireRequest.checkoutUrl && hostedCheckoutUrl(wireRequest.checkoutUrl))
      return NextResponse.json({
        ok: true,
        pending: true,
        payment,
        wire: { checkoutUrl: wireRequest.checkoutUrl },
      });
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://vxnta-movie-app.onrender.com'
        : new URL(request.url).origin);
    const returnQuery = new URLSearchParams({ txn: payment.txnId, returnTo: wireRequest.returnTo });
    const pi = payment.providerRef
      ? { id: payment.providerRef }
      : await createPaymentIntent({
          amountMnt: plan.priceMnt,
          description: `VXNTA — ${plan.name}`,
          reference: payment.txnId,
          idempotencyKey: `wire-${payment.txnId}`,
        });
    if (!pi || pi.error || typeof pi.id !== 'string' || !/^pi_[a-zA-Z0-9_-]{1,150}$/.test(pi.id))
      return NextResponse.json({ error: { code: 'WIRE_UNAVAILABLE' }, payment }, { status: 502 });

    await setPaymentProviderRef(payment.txnId, pi.id);

    const session = await createCheckoutSession({
      paymentIntentId: pi.id,
      successUrl: `${appUrl}/pricing?${returnQuery}`,
      cancelUrl: `${appUrl}/pricing?${returnQuery}&cancelled=1`,
      idempotencyKey: `sess-${payment.txnId}`,
    });
    const checkoutUrl = hostedCheckoutUrl(session?.url);
    if (
      !session ||
      session.error ||
      !checkoutUrl ||
      (session.payment_intent && session.payment_intent !== pi.id)
    )
      return NextResponse.json(
        { error: { code: 'WIRE_CHECKOUT_UNAVAILABLE' }, payment },
        { status: 502 },
      );
    await saveCheckoutUrl(await getDb(), user.id, payment.txnId, checkoutUrl);

    return NextResponse.json({
      ok: true,
      pending: true,
      payment,
      wire: { piId: pi.id, checkoutUrl },
    });
  }

  // qpay — create the invoice and stash its id on the PENDING row for reconciliation.
  const invoice = await createQpayInvoice({
    txnId: payment.txnId,
    amountMnt: plan.priceMnt,
    description: plan.name,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/qpay`,
  });
  if (invoice && !invoice.error && invoice.invoiceId)
    await setPaymentProviderRef(payment.txnId, invoice.invoiceId);
  if (!invoice) {
    return NextResponse.json({
      ok: true,
      pending: true,
      payment,
      qpay: null,
      note: 'QPay gateway not configured — set QPAY_INVOICE_URL and QPAY_INVOICE_AUTH in Vercel env.',
    });
  }
  if (invoice.error) {
    return NextResponse.json({
      ok: true,
      pending: true,
      payment,
      qpay: null,
      note: `QPay error: ${invoice.error.message || invoice.error.body || `HTTP ${invoice.error.status}`}`,
    });
  }
  return NextResponse.json({ ok: true, pending: true, payment, qpay: invoice });
}
