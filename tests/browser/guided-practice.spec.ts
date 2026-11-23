import { expect, test } from '@playwright/test';
import { emptySnapshot } from '../../src/lib/learning/snapshot';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('vxnta.scenechain.placement.dismissed.v1', '1'),
  );
});

test('one-sentence practice uses the real video, hides the meaning, slows down and stops at the sentence end', async ({
  page,
}) => {
  await page.goto('/learn', { waitUntil: 'domcontentloaded' });
  const practice = page.getByRole('region', { name: 'Нэг өгүүлбэрээр сурах' });
  const video = page.getByLabel('The Last Train sample lesson video');
  await expect(page.getByRole('button', { name: 'Сурах', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(practice).toContainText('Өгүүлбэр 1 / 6');
  await expect(
    practice.getByText('Сүүлчийн галт тэрэг арван минутын дараа явна.', { exact: true }),
  ).toHaveCount(0);
  await practice.getByRole('button', { name: 'Монгол утгыг нээх', exact: true }).click();
  await expect(practice.locator('[lang="mn"]')).toBeVisible();
  await expect(
    practice.getByRole('button', { name: 'Өгүүлбэрийг сонсох', exact: true }),
  ).toBeEnabled();
  await video.evaluate((element: HTMLVideoElement) => {
    element.muted = true;
  });
  await practice.getByLabel('Сонсох хурд', { exact: true }).selectOption('0.75');
  await practice.getByRole('button', { name: 'Өгүүлбэрийг сонсох', exact: true }).click();
  await expect
    .poll(() =>
      video.evaluate(
        (element: HTMLVideoElement) =>
          !element.paused && element.playbackRate === 0.75 && element.currentTime >= 1,
      ),
    )
    .toBe(true);
  await expect
    .poll(
      () =>
        video.evaluate(
          (element: HTMLVideoElement) =>
            element.paused && element.currentTime >= 4.069 && element.currentTime < 5,
        ),
      { timeout: 15000 },
    )
    .toBe(true);
  await practice.getByRole('checkbox', { name: 'Давтаж сонсох', exact: true }).check();
  await practice.getByRole('button', { name: 'Өгүүлбэрийг сонсох', exact: true }).click();
  await video.evaluate((element: HTMLVideoElement) => {
    element.currentTime = 4.05;
  });
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => !element.paused && element.currentTime < 2),
    )
    .toBe(true);
  await practice.getByRole('button', { name: 'Дараах өгүүлбэр →', exact: true }).click();
  await expect(practice).toContainText('Mira has lost her ticket.');
  expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/guided-learning-mobile.png', fullPage: true });
});

test('typed recall checks an actual saved word once, persists the wrong answer and updates the daily plan', async ({
  page,
}) => {
  await page.goto('/learn', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Explain last', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Үгийн тайлбар' });
  await dialog.getByRole('button', { name: 'Үг хадгалах', exact: true }).click();
  await dialog.getByRole('button', { name: 'Энэ үгээ давтах', exact: true }).click();
  await page.getByRole('button', { name: 'Санаж бичих', exact: true }).click();
  const form = page.getByRole('form', { name: 'Санаж бичих дасгал' });
  await expect(form).toContainText('The _____ train leaves in ten minutes.');
  await form.getByLabel('Англи үгээ бичээрэй').fill('training');
  await form.getByRole('button', { name: 'Шалгах', exact: true }).click();
  await expect(form.getByRole('status')).toContainText('Дахиад давтъя. last');
  await expect(form.getByLabel('Англи үгээ бичээрэй')).toBeDisabled();
  await form.getByRole('button', { name: 'Үр дүнгээ харах', exact: true }).click();
  await expect(page.getByText('Өнөөдрийн давтлагаа хийлээ!', { exact: true })).toBeVisible();
  await page.goto('/learning', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('list', { name: 'Өнөөдрийн сурах төлөвлөгөө' })).toContainText(
    'Санаж үзэх · 1/3',
  );
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('vxnta.learning.guest.v2')!).snapshot,
  );
  expect(saved.progress.items[0]).toMatchObject({ word: 'last', correct: 0, incorrect: 1 });
  expect(saved.activity.filter((event: { kind: string }) => event.kind === 'review')).toHaveLength(
    1,
  );
});

test('account import asks which guest data belongs to the learner and merges it without duplicate cards', async ({
  page,
}) => {
  let remote = emptySnapshot();
  let revision = 0;
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  await page.goto('/learn', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Explain last', exact: true }).click();
  await page.getByRole('button', { name: 'Үг хадгалах', exact: true }).click();
  await page.getByRole('button', { name: 'Тайлбарыг хаах', exact: true }).click();
  await page.unroute('**/api/auth/me');
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { me: { id: 'import-ui-fixture', roleCode: 'USER' } } }),
  );
  await page.route('**/api/learning/state', async (route) => {
    if (route.request().method() === 'PUT') {
      remote = route.request().postDataJSON().snapshot;
      revision++;
    }
    await route.fulfill({ json: { revision, snapshot: remote } });
  });
  await page.goto('/learning', { waitUntil: 'domcontentloaded' });
  await page.getByText('Нэвтрэхээс өмнө хийсэн дасгалаа нэмэх', { exact: true }).click();
  await page.getByRole('button', { name: 'Зочны дасгалыг шалгах', exact: true }).click();
  await expect(
    page.getByText('1 карт · 0 түвшний тест · 0 давталт', { exact: true }),
  ).toBeVisible();
  expect(remote.progress.items).toHaveLength(0);
  await page.getByRole('button', { name: 'Миний дасгал мөн — нэгтгэх', exact: true }).click();
  await expect.poll(() => remote.progress.items.length).toBe(1);
  await page.getByRole('button', { name: 'Зочны дасгалыг шалгах', exact: true }).click();
  await page.getByRole('button', { name: 'Миний дасгал мөн — нэгтгэх', exact: true }).click();
  const data = await page.evaluate(() => ({
    account: JSON.parse(localStorage.getItem('vxnta.learning.import-ui-fixture.v2')!),
    guest: JSON.parse(localStorage.getItem('vxnta.learning.guest.v2')!),
  }));
  expect(data.account.snapshot.progress.items).toHaveLength(1);
  expect(data.guest.snapshot.progress.items).toHaveLength(1);
});

test('subtitle translation polls the existing job after navigation and applies its completed caption; protocol fixture only', async ({
  page,
}) => {
  await page.route('**/api/watch/inception', (route) => route.fulfill({ json: { allowed: true } }));
  await page.route('https://vidsrcme.ru/**', (route) => route.abort());
  await page.route('**/api/subtitles/mongolian/**', (route) => route.fulfill({ status: 404 }));
  let submissions = 0;
  let complete = false;
  const jobUrl = '/api/subtitles/jobs/12345678-1234-1234-1234-123456789abc';
  const translatedUrl = '/api/subtitles/translated/12345678-1234-1234-1234-123456789abc';
  await page.route('**/api/subtitles/translate', (route) => {
    submissions++;
    return route.fulfill({ status: 202, json: { status: 'pending', jobUrl } });
  });
  await page.route(`**${jobUrl}`, (route) =>
    route.fulfill({
      status: complete ? 200 : 202,
      json: complete
        ? { status: 'completed', translatedUrl, partial: false }
        : { status: 'pending', jobUrl },
    }),
  );
  await page.goto('/watch/inception', { waitUntil: 'domcontentloaded' });
  await page.getByText('Subtitles', { exact: true }).click();
  await page.getByRole('button', { name: 'Монгол хадмал авах 🇲🇳', exact: true }).click();
  await expect(page.getByText('Монгол хадмал бэлтгэж байна.', { exact: false })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  complete = true;
  await page.getByText('Subtitles', { exact: true }).click();
  await page.getByRole('button', { name: 'Монгол хадмал авах 🇲🇳', exact: true }).click();
  await expect(page.getByTitle('Inception player')).toHaveAttribute(
    'src',
    new RegExp(encodeURIComponent(translatedUrl)),
  );
  expect(submissions).toBe(1);
});
