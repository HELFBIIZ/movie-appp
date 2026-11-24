import { expect, test } from '@playwright/test';
import { placementForms } from '../../src/lib/learning/placement';
import { addAssessment, emptySnapshot } from '../../src/lib/learning/snapshot';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('vxnta.scenechain.placement.dismissed.v1', '1'),
  );
});

test('a returning learner gets different test questions, keeps old results and alternates back on the next attempt', async ({
  page,
}) => {
  const answers = Object.fromEntries(
    placementForms.a.map((question) => [question.id, question.answer]),
  );
  const seed = addAssessment(emptySnapshot(), answers, Date.now() - 10000);
  await page.addInitScript((snapshot) => {
    if (!localStorage.getItem('vxnta.learning.guest.v2'))
      localStorage.setItem(
        'vxnta.learning.guest.v2',
        JSON.stringify({ revision: 0, dirty: false, snapshot }),
      );
  }, seed);
  await page.goto('/learning', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Тест дахин өгөх/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Эхлэх түвшний тест' });
  await dialog.getByRole('button', { name: 'Эхлэх', exact: true }).click();
  await expect(dialog).toContainText('Хувилбар B');
  for (let index = 0; index < placementForms.b.length; index++) {
    const question = placementForms.b[index];
    await expect(dialog).toContainText(question.context!);
    await dialog.getByRole('button', { name: question.answer, exact: true }).click();
    await dialog
      .getByRole('button', {
        name: index === 7 ? 'Үр дүнгээ харах' : 'Дараагийн асуулт',
        exact: true,
      })
      .click();
  }
  await expect(dialog.getByText('Зөв хариулт: 8 / 8')).toBeVisible();
  await dialog.getByRole('button', { name: 'Түвшний тестийг хаах' }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Дэлгэрэнгүй ахиц', { exact: true }).click();
  await expect(page.getByRole('list').filter({ hasText: '8/8' }).locator('li')).toHaveCount(2);
  const snapshot = await page.evaluate(
    () => JSON.parse(localStorage.getItem('vxnta.learning.guest.v2')!).snapshot,
  );
  expect(snapshot.assessments).toHaveLength(1);
  expect(snapshot.retests).toHaveLength(1);
  expect(snapshot.retests[0].form).toBe('b');
  await page.getByRole('button', { name: /Тест дахин өгөх/ }).click();
  await dialog.getByRole('button', { name: 'Эхлэх', exact: true }).click();
  await expect(dialog).toContainText(placementForms.a[0].context!);
});

test('lost hosted-checkout return is recovered with an owned read and no new checkout or charge; protocol fixture', async ({
  page,
}) => {
  const txn = 'tx_12345678-1234-1234-1234-123456789abc';
  const returnTo = '/watch/inception?learn=1';
  let confirmed = false;
  let checkoutWrites = 0;
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      json: {
        me: {
          id: 'recovery-fixture',
          username: 'learner',
          roleCode: 'USER',
          subscription: confirmed
            ? { planName: 'Monthly', expiresAt: '2027-01-01T00:00:00Z' }
            : null,
        },
      },
    }),
  );
  await page.route('**/api/learning/state', (route) =>
    route.fulfill({ json: { revision: 0, snapshot: emptySnapshot() } }),
  );
  await page.route('**/api/payment-options', (route) =>
    route.fulfill({ json: { bank: true, wire: true, qpay: false, demo: false } }),
  );
  await page.route('**/api/plans', (route) => route.fulfill({ json: { plans: [] } }));
  await page.route('**/api/rewards', (route) =>
    route.fulfill({ json: { rewards: [], myRewards: [] } }),
  );
  await page.route('**/api/checkout', (route) => {
    checkoutWrites++;
    return route.fulfill({ status: 500 });
  });
  await page.route('**/api/payments/wire/pending', (route) =>
    route.fulfill({
      json: {
        ownerId: 'recovery-fixture',
        payments: [
          {
            txnId: txn,
            status: 'PENDING',
            planName: 'Monthly',
            amountMnt: 5900,
            returnTo,
            checkoutUrl: 'https://pay.wire.mn/c/cs_previous',
          },
        ],
      },
    }),
  );
  await page.route(`**/api/payments/${txn}`, (route) =>
    route.fulfill({
      json: {
        payment: { status: confirmed ? 'SUCCESSFUL' : 'PENDING' },
        subscription: confirmed ? { expiresAt: '2027-01-01T00:00:00Z' } : null,
      },
    }),
  );
  await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
  const previous = page.getByRole('region', { name: 'Өмнөх Wire төлбөрүүд' });
  await expect(previous.getByRole('link', { name: 'Өмнөх төлбөрийн хуудас' })).toHaveAttribute(
    'href',
    'https://pay.wire.mn/c/cs_previous',
  );
  await previous.getByRole('button', { name: 'Төлөв шалгах', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Wire төлбөрийн төлөв' })).toContainText(
    'Төлбөр хүлээгдэж байна',
  );
  await expect(page.getByRole('link', { name: 'Киногоо үзэж, суралцах →' })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('txn')).toBe(txn);
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(returnTo);
  confirmed = true;
  await page.getByRole('button', { name: 'Төлбөрөө дахин шалгах' }).click();
  await expect(page.getByText('✓ Monthly until', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Киногоо үзэж, суралцах →' })).toHaveAttribute(
    'href',
    returnTo,
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: 'Киногоо үзэж, суралцах →' })).toHaveAttribute(
    'href',
    returnTo,
  );
  expect(checkoutWrites).toBe(0);
});
