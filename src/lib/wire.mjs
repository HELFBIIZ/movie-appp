// Official protocol: https://docs.wire.mn/en/docs/quickstart
import crypto from 'node:crypto';
const env = (key) => process.env[key]?.trim();
export function wireConfigured() {
  return Boolean(
    (env('WIRE_SECRET_KEY') || env('WIRE_API_KEY')) &&
    (!env('WIRE_API_BASE') || env('WIRE_API_BASE').replace(/\/$/, '') === 'https://api.wire.mn'),
  );
}
async function wireRequest(path, body, idempotencyKey) {
  if (!wireConfigured()) return null;
  try {
    const response = await fetch(`https://api.wire.mn/v1${path}`, {
      method: body ? 'POST' : 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
      headers: {
        Authorization: `Bearer ${env('WIRE_SECRET_KEY') || env('WIRE_API_KEY')}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) return { error: { code: 'WIRE_GATEWAY_ERROR', status: response.status } };
    return await response.json();
  } catch {
    return { error: { code: 'WIRE_UNAVAILABLE' } };
  }
}
export function createPaymentIntent({ amountMnt, description, reference, idempotencyKey }) {
  if (!Number.isSafeInteger(amountMnt) || amountMnt <= 0)
    return Promise.resolve({ error: { code: 'INVALID_AMOUNT' } });
  return wireRequest(
    '/payment_intents',
    {
      currency: 'MNT',
      amount: amountMnt,
      description: String(description || '').slice(0, 500),
      metadata: { reference },
    },
    idempotencyKey,
  );
}
export function createCheckoutSession({ paymentIntentId, successUrl, cancelUrl, idempotencyKey }) {
  return wireRequest(
    '/checkout/sessions',
    { payment_intent: paymentIntentId, success_url: successUrl, cancel_url: cancelUrl },
    idempotencyKey,
  );
}
export function retrievePaymentIntent(id) {
  if (typeof id !== 'string' || !/^pi_[a-zA-Z0-9_-]{1,150}$/.test(id))
    return Promise.resolve({ error: { code: 'INVALID_INTENT' } });
  return wireRequest(`/payment_intents/${encodeURIComponent(id)}`);
}
// Read-only preflight endpoints; neither creates an intent or moves money.
export function previewWireRouting(amountMnt) {
  if (!Number.isSafeInteger(amountMnt) || amountMnt <= 0)
    return Promise.resolve({ error: { code: 'INVALID_AMOUNT' } });
  return wireRequest(`/routing/preview?amount=${amountMnt}`);
}
export function listWireBankAccounts() {
  return wireRequest('/bank_accounts');
}
export { hostedCheckoutUrl } from './payments/checkout-url.mjs';
export function wirePaymentMatches(payment, intent) {
  return Boolean(
    payment &&
    intent &&
    payment.provider === 'wire' &&
    typeof intent.id === 'string' &&
    intent.id === payment.providerRef &&
    Number.isSafeInteger(intent.amount) &&
    intent.amount === Number(payment.amountMnt) &&
    intent.currency === 'MNT' &&
    payment.currency === 'MNT' &&
    intent.status === 'succeeded' &&
    (!intent.metadata?.reference || intent.metadata.reference === payment.txnId),
  );
}
export function webhookIntent(event) {
  const data = event?.data;
  if (!data || typeof data !== 'object') return null;
  const intent = data.object && typeof data.object === 'object' ? data.object : data;
  return typeof intent.id === 'string' && /^pi_[a-zA-Z0-9_-]{1,150}$/.test(intent.id)
    ? intent
    : null;
}
export function verifyWireSignature(rawBody, signatureHeader, secret, now = Date.now()) {
  if (!rawBody || !signatureHeader || !secret) return false;
  try {
    const parts = signatureHeader.split(',').map((part) => part.trim().split('='));
    const timestamps = parts.filter(([key]) => key === 't');
    if (timestamps.length !== 1 || !/^\d{1,12}$/.test(timestamps[0][1])) return false;
    const timestamp = timestamps[0][1];
    if (Math.abs(now / 1000 - Number(timestamp)) >= 300) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody}`)
      .digest();
    return parts.some(
      ([key, value]) =>
        key === 'v1' &&
        /^[a-f0-9]{64}$/i.test(value || '') &&
        crypto.timingSafeEqual(expected, Buffer.from(value, 'hex')),
    );
  } catch {
    return false;
  }
}
