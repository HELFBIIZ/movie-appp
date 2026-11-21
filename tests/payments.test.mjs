import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  createPaymentIntent,
  createCheckoutSession,
  verifyWireSignature,
} from '../src/lib/wire.mjs';
import { checkQpayInvoices, isQpayPaid, verifyQpayToken } from '../src/lib/qpay.mjs';

function fixtureEnv(context, values) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test('Wire signatures and QPay callbacks reject missing, wrong and tampered credentials', () => {
  const raw = '{"id":"fixture-payment","status":"succeeded"}';
  const secret = 'fixture-signing-secret';
  const timestamp = '1795233600';
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  assert.equal(verifyWireSignature(raw, `t=${timestamp},v1=${signature}`, secret), true);
  assert.equal(verifyWireSignature(raw + ' ', `t=${timestamp},v1=${signature}`, secret), false);
  assert.equal(verifyWireSignature(raw, `t=${timestamp},v1=${signature}`, 'wrong-secret'), false);
  assert.equal(verifyWireSignature(raw, '', secret), false);
  assert.equal(verifyQpayToken('fixture-token', 'fixture-token'), true);
  assert.equal(verifyQpayToken('wrong-token', 'fixture-token'), false);
  assert.equal(verifyQpayToken('', ''), false);
  for (const payment_status of ['CREATED', 'PENDING', 'CLOSED', undefined])
    assert.equal(isQpayPaid({ payment_status }), false);
  for (const payment_status of ['PAID', 'SETTLED'])
    assert.equal(isQpayPaid({ payment_status }), true);
});

test('Wire intent/checkout and QPay polling retain their request contracts without real network', async (context) => {
  fixtureEnv(context, {
    WIRE_API_BASE: 'https://wire.fixture.test',
    WIRE_SECRET_KEY: 'fixture-key',
    QPAY_INVOICE_AUTH: 'fixture-auth',
    QPAY_PAYMENT_CHECK_URL: 'https://qpay.fixture.test/check',
  });
  const calls = [];
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response(
      JSON.stringify(
        url.includes('qpay') ? { rows: [{ payment_status: 'CREATED' }] } : { id: 'fixture-intent' },
      ),
      { status: 200 },
    );
  });
  await createPaymentIntent({
    amountMnt: 5900,
    description: 'Monthly Unlimited',
    reference: 'fixture-txn',
    idempotencyKey: 'fixture-txn',
  });
  assert.deepEqual(calls[0].body, {
    currency: 'MNT',
    amount: 5900,
    description: 'Monthly Unlimited',
    metadata: { reference: 'fixture-txn' },
  });
  assert.equal(calls[0].init.headers['Idempotency-Key'], 'fixture-txn');
  await createCheckoutSession({
    paymentIntentId: 'fixture-intent',
    successUrl: 'https://vxnta.fixture.test/pricing',
    idempotencyKey: 'fixture-checkout',
  });
  assert.deepEqual(calls[1].body, {
    payment_intent: 'fixture-intent',
    success_url: 'https://vxnta.fixture.test/pricing',
  });
  const result = await checkQpayInvoices(['fixture-invoice']);
  assert.deepEqual(calls[2].body, { invoice_id: ['fixture-invoice'] });
  assert.equal(isQpayPaid(result.rows[0]), false);
});
