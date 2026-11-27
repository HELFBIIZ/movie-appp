import { expect, test } from '@playwright/test';

test('Wire readiness endpoint exposes read-only aggregates and no payment creation method', async ({
  request,
}) => {
  const response = await request.get('/api/payments/wire/readiness');
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(typeof data.configured).toBe('boolean');
  expect(typeof data.apiReachable).toBe('boolean');
  expect(data.paidTransactionVerified).toBe(false);
  expect(Object.keys(data).sort()).toEqual(
    [
      'apiReachable',
      'checkedAmountMnt',
      'checkedAt',
      'configured',
      'paidTransactionVerified',
      'routingAvailable',
      'settlementConfigured',
      'status',
    ].sort(),
  );
  expect((await request.post('/api/payments/wire/readiness')).status()).toBe(405);
});
