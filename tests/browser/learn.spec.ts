import { expect, test } from '@playwright/test';

test('a new visitor starts a real free lesson, hears a sentence, saves a word and reviews it', async ({
  page,
}) => {
  const accessRequests: string[] = [];
  let allowVideo = () => {};
  const videoGate = new Promise<void>((resolve) => {
    allowVideo = resolve;
  });
  await page.route('**/learning/last-train.webm', async (route) => {
    await videoGate;
    await route.continue();
  });
  page.on('request', (request) => {
    if (request.url().includes('/api/watch/')) accessRequests.push(request.url());
  });
  await page.goto('/learn', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Нэг өгүүлбэрээс эхэлье.' })).toBeVisible();
  await expect(page.getByText('38 секундийн сургалтын жишээ · Киноны хэсэг биш.')).toBeVisible();
  const video = page.getByLabel('The Last Train sample lesson video');
  try {
    const start = page.getByRole('button', { name: 'Сонсоод эхлэх', exact: true });
    await expect(start).toBeEnabled();
    expect(await video.evaluate((element: HTMLVideoElement) => element.readyState)).toBe(0);
    await start.click();
  } finally {
    allowVideo();
  }
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime >= 1))
    .toBe(true);
  await page.getByRole('button', { name: '«last» үгийг туршъя', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Үгийн тайлбар' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('сүүлчийн');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await page.getByRole('button', { name: 'Өгүүлбэрээ дахин сонсох', exact: true }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await page.getByRole('button', { name: 'Explain last', exact: true }).click();
  await dialog.getByRole('button', { name: 'Үг хадгалах', exact: true }).click();
  await dialog.getByRole('button', { name: 'Энэ үгээ давтах', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'сүүлчийн', exact: true }).click();
  await expect(page.getByText('Дасгал дууслаа!', { exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Давталтын явц' })).toHaveAttribute(
    'aria-valuenow',
    '1',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Хадгалсан (1)', exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('vxnta.scenechain.v1')!));
  expect(saved.items[0]).toMatchObject({
    word: 'last',
    meaning: 'сүүлчийн',
    correct: 1,
    provenance: 'curated',
  });
  expect(accessRequests).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/free-lesson-mobile.png', fullPage: true });
});

test('review shows one question at a time and explains a wrong answer before continuing', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const items = [
      { id: 'starter-last', word: 'last', meaning: 'сүүлчийн' },
      { id: 'starter-train', word: 'train', meaning: 'галт тэрэг' },
    ].map((item) => ({
      ...item,
      kind: 'word',
      example: 'The last train leaves in ten minutes.',
      movieId: 'scenechain-intro',
      mediaId: 'scenechain-last-train-v1',
      cueStart: 1,
      cueEnd: 6.5,
      stage: 0,
      correct: 0,
      incorrect: 0,
      dueAt: Date.now(),
      savedAt: Date.now(),
      provenance: 'curated',
    }));
    localStorage.setItem(
      'vxnta.scenechain.v1',
      JSON.stringify({ items, contextCorrect: 0, contextIncorrect: 0 }),
    );
  });
  await page.goto('/learn');
  await page.getByRole('button', { name: 'Хадгалсан үгээ давтах', exact: true }).click();
  const panels = page.locator('#learning-panels');
  await expect(panels.locator('fieldset:visible')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Дараагийн үг →', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'сүүлчийн', exact: true }).click();
  await page.getByRole('button', { name: 'Дараагийн үг →', exact: true }).click();
  await expect(panels).toContainText('“train”');
  await page.getByRole('button', { name: 'тасалбар', exact: true }).click();
  await expect(panels).toContainText('Дахиад тогтооё. train: галт тэрэг');
  await expect(panels).toContainText('Оноо: 1/2');
  await expect(page.getByRole('button', { name: 'галт тэрэг', exact: true })).toBeDisabled();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('vxnta.scenechain.v1')!),
  );
  expect(stored.items.find((item: { word: string }) => item.word === 'train').incorrect).toBe(1);
});

test('the movie entry opens learning mode and gives guests a separate free starter lesson', async ({
  page,
}) => {
  await page.route('**/api/watch/spider-man-brand-new-day', (route) =>
    route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } }),
  );
  await page.goto('/movie/spider-man-brand-new-day', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: 'Үзэнгээ үг сурах' })).toHaveAttribute(
    'href',
    '/watch/spider-man-brand-new-day?learn=1',
  );
  await page.getByRole('link', { name: 'Үзэнгээ үг сурах' }).click();
  await expect(page.getByRole('button', { name: 'Үг сурах', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('link', { name: 'Үнэгүй дасгалаар эхлэх', exact: true }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('heading', { name: 'Нэг өгүүлбэрээс эхэлье.' })).toBeVisible();
});
