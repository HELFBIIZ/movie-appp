import { expect, test } from '@playwright/test';
import { emptySnapshot } from '../../src/lib/learning/snapshot';
import { dismissPlacement } from './learning-fixtures';

test('login recovers from a network failure and register asks for email exactly once', async ({
  page,
}) => {
  await page.route('**/api/auth/login', (route) => route.abort());
  await page.route('**/api/auth/register', (route) => {
    expect(route.request().postDataJSON()).toEqual({
      username: 'learner',
      email: 'learner@example.test',
      password: 'fixture-password',
    });
    return route.fulfill({ status: 409, json: { error: { code: 'EMAIL_TAKEN' } } });
  });
  await page.goto('/login');
  await page.getByLabel('Имэйл эсвэл хэрэглэгчийн нэр', { exact: true }).fill('learner');
  await page.getByLabel('Нууц үг', { exact: true }).fill('fixture-password');
  await page.locator('form').getByRole('button', { name: 'Нэвтрэх', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Холбогдож чадсангүй');
  await expect(
    page.locator('form').getByRole('button', { name: 'Нэвтрэх', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Бүртгүүлэх', exact: true }).click();
  await expect(page.locator('input[type="email"]')).toHaveCount(1);
  await page.getByLabel('Хэрэглэгчийн нэр', { exact: true }).fill('learner');
  await page.getByLabel('Имэйл', { exact: true }).fill('learner@example.test');
  await page.getByLabel('Нууц үг', { exact: true }).fill('fixture-password');
  await page.locator('form').getByRole('button', { name: 'Бүртгэл үүсгэх', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Энэ имэйлээр бүртгэл үүссэн');
  await expect(page.getByText('EMAIL_TAKEN', { exact: true })).toHaveCount(0);
});

test('bank transfer includes monthly plan and retry keeps the receipt details; no payment is made', async ({
  page,
}) => {
  await dismissPlacement(page);
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { me: { id: 'bank-fixture', username: 'learner', roleCode: 'USER' } } }),
  );
  await page.route('**/api/learning/state', (route) =>
    route.fulfill({ json: { revision: 0, snapshot: emptySnapshot() } }),
  );
  await page.route('**/api/payment-options', (route) =>
    route.fulfill({ json: { bank: true, wire: true, qpay: false, demo: false } }),
  );
  await page.route('**/api/plans', (route) =>
    route.fulfill({
      json: {
        plans: [
          {
            id: 'monthly',
            code: 'MONTHLY',
            name: 'Monthly Unlimited',
            priceMnt: 5900,
            durationDays: 30,
          },
        ],
      },
    }),
  );
  await page.route('**/api/rewards', (route) =>
    route.fulfill({ json: { rewards: [], myRewards: [] } }),
  );
  let succeed = false;
  await page.route('**/api/payments/manual', (route) => {
    expect(route.request().postDataJSON()).toEqual({
      planCode: 'MONTHLY',
      phone: '99881234',
      note: 'fixture-reference',
      imageData: null,
    });
    return succeed
      ? route.fulfill({ json: { receipt: { txnId: 'receipt-fixture' } } })
      : route.abort();
  });
  await page.goto('/pricing');
  await page.getByText('Банкны шилжүүлэг', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Багц', exact: true }).selectOption('MONTHLY');
  await page.getByLabel('Утасны дугаар', { exact: true }).fill('99881234');
  await page.getByLabel('Гүйлгээний дугаар, тайлбар', { exact: true }).fill('fixture-reference');
  await page.getByRole('button', { name: 'Баримт илгээх', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Холболт тасарлаа');
  await expect(page.getByRole('button', { name: 'Баримт илгээх', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Гүйлгээний дугаар, тайлбар', { exact: true })).toHaveValue(
    'fixture-reference',
  );
  succeed = true;
  await page.getByRole('button', { name: 'Баримт илгээх', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    'Админ шалгаж баталгаажуулсны дараа VIP эрх нээгдэнэ',
  );
  await expect(page.getByRole('button', { name: /QPay-ээр төлөх/ })).toHaveCount(0);
});

test('finishing placement on an already open watch page starts learning without losing the URL parameters', async ({
  page,
}) => {
  await page.goto('/watch/inception?source=entry');
  const dialog = page.getByRole('dialog', { name: 'Эхлэх түвшний тест' });
  await dialog.getByRole('button', { name: 'Эхлэх', exact: true }).click();
  for (let index = 0; index < 8; index++) {
    await dialog.getByRole('button', { name: 'Мэдэхгүй · Алгасах', exact: true }).click();
    await dialog
      .getByRole('button', {
        name: index === 7 ? 'Үр дүнгээ харах' : 'Дараагийн асуулт',
        exact: true,
      })
      .click();
  }
  await dialog.getByRole('button', { name: 'Энэ киногоор сурах', exact: true }).click();
  await expect(page.getByRole('region', { name: 'SceneChain Learning Dock' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('source')).toBe('entry');
  expect(new URL(page.url()).searchParams.get('learn')).toBe('1');
});
