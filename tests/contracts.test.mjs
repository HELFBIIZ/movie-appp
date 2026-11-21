import assert from 'node:assert/strict';
import test from 'node:test';
import { sessionIndicatorSchema, watchAccessSchema } from '../src/lib/contracts.ts';

test('UI decoding accepts current API additions and rejects malformed account/watch payloads', () => {
  assert.equal(
    sessionIndicatorSchema.parse({ me: { roleCode: 'ADMIN', futureField: true } }).me.roleCode,
    'ADMIN',
  );
  assert.deepEqual(sessionIndicatorSchema.parse({ error: { code: 'UNAUTHENTICATED' } }), {});
  assert.equal(sessionIndicatorSchema.safeParse({ me: 'not a public user' }).success, false);
  assert.equal(
    watchAccessSchema.parse({ allowed: true, xp: { gained: 20 }, futureField: true }).xp.gained,
    20,
  );
  assert.equal(watchAccessSchema.safeParse({ allowed: 'false' }).success, false);
  assert.equal(watchAccessSchema.safeParse({ allowed: true, xp: { gained: '20' } }).success, false);
});

test('an error response never turns into an allowed watch grant during decoding', () => {
  for (const code of [
    'UNAUTHENTICATED',
    'SUBSCRIPTION_REQUIRED',
    'EXPIRED_SUBSCRIPTION',
    'RATE_LIMITED',
  ]) {
    const decoded = watchAccessSchema.parse({ error: { code, status: 401 } });
    assert.equal(decoded.allowed, undefined);
    assert.equal(decoded.error.code, code);
  }
});
