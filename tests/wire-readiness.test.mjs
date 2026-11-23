import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWireReadinessCheck } from '../src/lib/wire-readiness.ts';
import { previewWireRouting, listWireBankAccounts } from '../src/lib/wire.mjs';

const route = () => ({
  object: 'routing_preview',
  selected: 'op_fixture',
  reason: 'private routing metadata',
});
const accounts = () => ({
  object: 'list',
  data: [
    {
      object: 'bank_account',
      is_default: true,
      settlement_selectable: true,
      holder_name: 'private name',
      account_number_last4: '1234',
    },
  ],
});
test('unconfigured Wire never sends a provider request', async () => {
  const unexpected = () => {
    throw new Error('Must not call provider');
  };
  const check = createWireReadinessCheck({
    configured: () => false,
    preview: unexpected,
    banks: unexpected,
    now: () => 1000,
  });
  assert.equal((await check()).status, 'not_configured');
});
test('Wire preflight returns aggregate readiness and never exposes private provider fields', async () => {
  const check = createWireReadinessCheck({
    configured: () => true,
    preview: async () => route(),
    banks: async () => accounts(),
    now: () => 1000,
  });
  const result = await check();
  assert.equal(result.status, 'available');
  assert.equal(result.apiReachable, true);
  assert.equal(result.settlementConfigured, true);
  assert.equal(result.paidTransactionVerified, false);
  const serialized = JSON.stringify(result);
  for (const secret of ['op_fixture', 'private name', '1234', 'private routing metadata'])
    assert.equal(serialized.includes(secret), false);
});
test('preflight distinguishes rejected authentication, unavailable operators, missing default settlement and invalid responses', async () => {
  const cases = [
    [{ error: { status: 401 } }, { error: { status: 401 } }, 'authentication_failed'],
    [{ error: { status: 400 } }, accounts(), 'operator_unavailable'],
    [route(), { object: 'list', data: [] }, 'settlement_missing'],
    [
      route(),
      {
        object: 'list',
        data: [{ object: 'bank_account', is_default: false, settlement_selectable: true }],
      },
      'settlement_missing',
    ],
    [{ object: 'unexpected' }, accounts(), 'unavailable'],
    [route(), { error: { status: 503 } }, 'unavailable'],
  ];
  for (const [routing, bankAccounts, expected] of cases) {
    const check = createWireReadinessCheck({
      configured: () => true,
      preview: async () => routing,
      banks: async () => bankAccounts,
    });
    assert.equal((await check()).status, expected);
  }
});
test('concurrent checks share one read-only probe and cache expires without hiding configuration removal', async () => {
  let calls = 0,
    time = 1000,
    enabled = true;
  const check = createWireReadinessCheck({
    configured: () => enabled,
    preview: async () => {
      calls++;
      return route();
    },
    banks: async () => {
      calls++;
      return accounts();
    },
    now: () => time,
  });
  await Promise.all([check(), check(), check()]);
  assert.equal(calls, 2);
  time += 60_001;
  await check();
  assert.equal(calls, 4);
  enabled = false;
  assert.equal((await check()).status, 'not_configured');
  assert.equal(calls, 4);
});
test('failed provider promises stay unavailable instead of creating false readiness', async () => {
  const check = createWireReadinessCheck({
    configured: () => true,
    preview: async () => {
      throw new Error('private token');
    },
    banks: async () => {
      throw new Error('private account');
    },
  });
  const result = await check();
  assert.equal(result.status, 'unavailable');
  assert.equal(JSON.stringify(result).includes('private'), false);
});
test('provider preflight uses only documented GET endpoints and never creates or confirms payment', async (context) => {
  const previous = process.env.WIRE_SECRET_KEY,
    previousBase = process.env.WIRE_API_BASE;
  process.env.WIRE_SECRET_KEY = 'fixture-not-real';
  process.env.WIRE_API_BASE = 'https://api.wire.mn';
  context.after(() => {
    if (previous === undefined) delete process.env.WIRE_SECRET_KEY;
    else process.env.WIRE_SECRET_KEY = previous;
    if (previousBase === undefined) delete process.env.WIRE_API_BASE;
    else process.env.WIRE_API_BASE = previousBase;
  });
  const paths = [];
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(init.method, 'GET');
    assert.equal(init.body, undefined);
    paths.push(url);
    return Response.json(url.includes('routing/preview') ? route() : accounts());
  });
  await previewWireRouting(5900);
  await listWireBankAccounts();
  assert.deepEqual(paths, [
    'https://api.wire.mn/v1/routing/preview?amount=5900',
    'https://api.wire.mn/v1/bank_accounts',
  ]);
});
