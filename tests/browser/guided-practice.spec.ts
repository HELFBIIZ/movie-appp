import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { emptySnapshot } from '../../src/lib/learning/snapshot';
import { openLocal, seedWords, dismissPlacement } from './learning-fixtures';

test('sentence replay uses real native video, slows down, stops at the cue end and can loop', async ({
  page,
}) => {
  const video = await openLocal(page);
  const practice = page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' });
  await practice.getByText('Сонсох тохиргоо', { exact: true }).click();
  await practice.getByLabel('Удаанаар сонсох', { exact: true }).check();
  await practice.getByRole('button', { name: 'Дахин сонсох', exact: true }).click();
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
  await practice.getByLabel('Давтаж сонсох', { exact: true }).check();
  await practice.getByRole('button', { name: 'Дахин сонсох', exact: true }).click();
  await video.evaluate((element: HTMLVideoElement) => {
    element.currentTime = 4.05;
  });
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => !element.paused && element.currentTime < 2),
    )
    .toBe(true);
  await practice.getByRole('button', { name: 'Дараагийн өгүүлбэр', exact: true }).click();
  await expect(practice).toContainText('Mira has lost her ticket.');
  expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
});

test('the same word teaches separate contextual senses and a phrase is learned together', async ({
  page,
}) => {
  await openLocal(
    page,
    'WEBVTT\n\n00:01.000 --> 00:04.000\nTurn right at the station.\n\n00:07.000 --> 00:10.000\nYou are right about the tickets.\n\n00:12.000 --> 00:15.000\nWe can figure it out together.\n',
  );
  const practice = page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' });
  const dialog = page.getByRole('dialog', { name: 'Үгийн тайлбар' });
  mkdirSync('.refactor-evidence/preview', { recursive: true });
  for (const meaning of ['баруун', 'зөв']) {
    await practice.getByRole('button', { name: 'right — утгыг харах', exact: true }).click();
    await expect(dialog).toContainText(meaning);
    if (meaning === 'баруун') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: '.refactor-evidence/preview/word-coach-mobile.png' });
    }
    await dialog.getByRole('button', { name: 'Энэ үгийг суръя', exact: true }).click();
    await dialog.getByRole('button', { name: meaning, exact: true }).click();
    await page.getByRole('button', { name: 'Тайлбарыг хаах', exact: true }).click();
    await practice.getByRole('button', { name: 'Дараагийн өгүүлбэр', exact: true }).click();
  }
  await practice
    .getByRole('button', { name: 'figure it out — утгыг харах', exact: true })
    .first()
    .click();
  await expect(dialog).toContainText('учрыг нь олох');
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('vxnta.learning.guest.v2')!).snapshot.progress.items,
  );
  expect(saved).toHaveLength(2);
  expect(new Set(saved.map((item: { id: string }) => item.id)).size).toBe(2);
  expect(saved.map((item: { meaning: string }) => item.meaning)).toEqual(['баруун', 'зөв']);
});

test('account import explicitly merges guest cards without duplicating them', async ({ page }) => {
  await dismissPlacement(page);
  await seedWords(page);
  let remote = emptySnapshot();
  let revision = 0;
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
  await page.goto('/learning');
  await page.getByText('Нэвтрэхээс өмнө хийсэн дасгалаа нэмэх', { exact: true }).click();
  await page.getByRole('button', { name: 'Зочны дасгалыг шалгах', exact: true }).click();
  expect(remote.progress.items).toHaveLength(0);
  await page.getByRole('button', { name: 'Миний дасгал мөн — нэгтгэх', exact: true }).click();
  await expect.poll(() => remote.progress.items.length).toBe(2);
  await page.getByRole('button', { name: 'Зочны дасгалыг шалгах', exact: true }).click();
  await page.getByRole('button', { name: 'Миний дасгал мөн — нэгтгэх', exact: true }).click();
  expect(remote.progress.items).toHaveLength(2);
});

test('unknown word shows provider failure honestly and can retry without losing the selection', async ({
  page,
}) => {
  let ready = false;
  await page.route('**/api/learning/word?word=astonished', (route) =>
    route.fulfill(
      ready
        ? {
            json: {
              word: 'astonished',
              meaning: 'ихэд гайхсан',
              tip: '',
              example: '',
              translation: '',
              contextual: false,
              source: 'mymemory',
            },
          }
        : { status: 503, json: { error: { code: 'MEANING_UNAVAILABLE' } } },
    ),
  );
  await openLocal(page, 'WEBVTT\n\n00:01.000 --> 00:04.000\nShe was astonished.\n');
  await page.getByRole('button', { name: 'astonished — утгыг харах', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Энэ үгийг суръя', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Дахин хайх', exact: true })).toBeVisible();
  ready = true;
  await dialog.getByRole('button', { name: 'Дахин хайх', exact: true }).click();
  await expect(dialog).toContainText('ихэд гайхсан');
  await expect(dialog.getByRole('button', { name: 'Энэ үгийг суръя', exact: true })).toBeEnabled();
});

test('subtitle translation polls the existing job after navigation and applies its completed caption; protocol fixture only', async ({
  page,
}) => {
  await dismissPlacement(page);
  await page.route('**/api/watch/inception', (route) => route.fulfill({ json: { allowed: true } }));
  await page.route('https://bingeapi.st/**', (route) => route.abort());
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
