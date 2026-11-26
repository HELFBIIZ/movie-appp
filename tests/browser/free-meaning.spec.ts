import { expect, test } from '@playwright/test';
import { openLocal } from './learning-fixtures';

test('sentence meaning is on demand, returns to the word lesson and reuses the learned sentence', async ({
  page,
}) => {
  let calls = 0;
  const paidRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/api\/(?:checkout|subtitles\/translate)/.test(request.url()))
      paidRequests.push(request.url());
  });
  await page.route('**/api/learning/sentence', (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({
      text: 'The last train leaves in ten minutes.',
    });
    return route.fulfill({
      json: { translation: 'Сүүлчийн галт тэрэг арван минутын дараа хөдөлнө.', source: 'mymemory' },
    });
  });
  await openLocal(page);
  const practice = page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' });
  expect(calls).toBe(0);
  await practice.getByRole('button', { name: 'Монгол утгыг үзэх', exact: true }).click();
  await expect(practice).toContainText('Сүүлчийн галт тэрэг арван минутын дараа хөдөлнө.');
  await expect(practice).toContainText('Автомат утга · MyMemory');
  await practice.getByRole('button', { name: 'last — утгыг харах', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Үгийн тайлбар' })).toContainText(
    'Сүүлчийн галт тэрэг арван минутын дараа хөдөлнө.',
  );
  await page.keyboard.press('Escape');
  await practice.getByRole('button', { name: 'Дараагийн өгүүлбэр', exact: true }).click();
  await practice.getByRole('button', { name: 'Өмнөх өгүүлбэр', exact: true }).click();
  await expect(practice).toContainText('Сүүлчийн галт тэрэг');
  expect(calls).toBe(1);
  expect(paidRequests).toEqual([]);
});

test('free limit and guest guards do not call a paid provider or show false subtitles', async ({
  page,
  request,
}) => {
  expect(
    (await request.post('/api/learning/sentence', { data: { text: 'Hello!' } })).status(),
  ).toBe(401);
  await page.route('**/api/learning/sentence', (route) =>
    route.fulfill({ status: 429, json: { error: { code: 'FREE_LIMIT_REACHED' } } }),
  );
  await openLocal(page);
  const practice = page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' });
  await practice.getByRole('button', { name: 'Монгол утгыг үзэх', exact: true }).click();
  await expect(practice.getByRole('status')).toContainText('Өнөөдрийн үнэгүй хязгаарт хүрлээ');
  await expect(practice.locator('[lang="mn"]')).toHaveCount(0);
  await expect(
    practice.getByRole('button', { name: 'train — утгыг харах', exact: true }),
  ).toBeEnabled();
});

test('an existing Mongolian cue needs no external request', async ({ page }) => {
  let calls = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/learning/sentence')) calls++;
  });
  await openLocal(
    page,
    'WEBVTT\n\n00:01.000 --> 00:04.000\nHello there!\n',
    'WEBVTT\n\n00:01.000 --> 00:04.000\nСайн байна уу!\n',
  );
  await expect(page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' })).toContainText(
    'Сайн байна уу!',
  );
  await expect(page.getByRole('button', { name: 'Монгол утгыг үзэх', exact: true })).toHaveCount(0);
  expect(calls).toBe(0);
});
