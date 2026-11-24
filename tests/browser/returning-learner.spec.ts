import { expect, test } from '@playwright/test';
import { emptySnapshot } from '../../src/lib/learning/snapshot';
import { placementQuestions } from '../../src/lib/learning/placement';

test('returning learner waits for account history before the first-entry test is offered', async ({
  page,
}) => {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      json: { me: { id: 'returning-fixture', username: 'learner', roleCode: 'USER' } },
    }),
  );
  let release = () => {};
  let requested = () => {};
  const requestedGate = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/learning/state', async (route) => {
    requested();
    await responseGate;
    const snapshot = emptySnapshot();
    snapshot.assessments.push({
      answers: Object.fromEntries(
        placementQuestions.map((question) => [question.id, question.answer]),
      ),
      completedAt: Date.now(),
    });
    await route.fulfill({ json: { revision: 1, snapshot } });
  });
  await page.goto('/learning', { waitUntil: 'domcontentloaded' });
  await requestedGate;
  try {
    await expect(page.getByText('Хадгалсан үг', { exact: true })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Эхлэх түвшний тест' })).not.toBeVisible();
  } finally {
    release();
  }
  await expect(page.getByRole('button', { name: /Дунд · Тест дахин өгөх/ })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Эхлэх түвшний тест' })).not.toBeVisible();
});
