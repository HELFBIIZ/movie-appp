import { expect, test } from '@playwright/test';
import { dismissPlacement } from './learning-fixtures';
import { mkdirSync, readFileSync } from 'node:fs';

const english =
  'WEBVTT\n\n00:01.000 --> 00:04.000\nWe can try again.\n\n00:06.000 --> 00:09.000\nThe train is here.\n';
const mongolian =
  'WEBVTT\n\n00:01.000 --> 00:04.000\nБид дахин оролдож болно.\n\n00:06.000 --> 00:09.000\nГалт тэрэг энд байна.\n';

test('native captions stay in the video in fullscreen and learning follows its real clock without reload loops; original media only', async ({
  page,
}) => {
  await dismissPlacement(page);
  await page.route('**/api/watch/inception', (route) => route.fulfill({ json: { allowed: true } }));
  await page.route('https://bingeapi.st/**', (route) => route.abort());
  const original = readFileSync('tests/fixtures/last-train.webm');
  await page.route('**/qa/original.webm', (route) => {
    const range = route.request().headers().range;
    const match = range ? /bytes=(\d+)-(\d*)/.exec(range) : null;
    if (!match) {
      return route.fulfill({
        status: 200,
        body: original,
        contentType: 'video/webm',
        headers: { 'Accept-Ranges': 'bytes', 'Content-Length': String(original.length) },
      });
    }
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : original.length - 1;
    return route.fulfill({
      status: 206,
      body: original.subarray(start, end + 1),
      contentType: 'video/webm',
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${original.length}`,
        'Content-Length': String(end - start + 1),
      },
    });
  });
  await page.route('**/api/subtitles/mongolian/inception', (route) =>
    route.fulfill({ body: mongolian, contentType: 'text/vtt' }),
  );
  await page.route('**/api/learning/subtitles?**', (route) =>
    route.fulfill({
      json: { english, mongolian, notice: 'Original protocol fixture, not movie dialogue.' },
    }),
  );
  let loads = 0;
  await page.route('**/api/stream/tmdb?**', (route) => {
    loads++;
    return route.fulfill({
      json: { url: '/qa/original.webm', provider: 'Original fixture', candidates: [{}, {}] },
    });
  });
  await page.goto('/watch/inception', { waitUntil: 'domcontentloaded' });
  const select = page.getByRole('combobox', { name: 'Тоглуулагч', exact: true });
  await select.selectOption('hls');
  const video = page.getByLabel('Шууд видео тоглуулагч', { exact: true });
  await expect
    .poll(() => video.evaluate((video: HTMLVideoElement) => video.readyState))
    .toBeGreaterThan(0);
  await expect
    .poll(() => video.evaluate((video: HTMLVideoElement) => video.textTracks[0]?.cues?.length ?? 0))
    .toBe(2);
  await expect
    .poll(() => video.evaluate((video: HTMLVideoElement) => video.readyState))
    .toBeGreaterThanOrEqual(2);
  await video.evaluate((video: HTMLVideoElement) => {
    video.muted = true;
    video.pause();
    video.currentTime = 2;
  });
  await expect
    .poll(() => video.evaluate((video: HTMLVideoElement) => video.currentTime))
    .toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Үг сурах', exact: true }).click();
  await expect(select).toHaveValue('hls');
  await expect(page.getByTestId('active-cue')).toContainText('We can try again.');
  await page.getByRole('button', { name: 'Бүх хадмал', exact: true }).click();
  await page.getByRole('button', { name: '00:06 руу очих', exact: true }).click();
  await expect
    .poll(() => video.evaluate((video: HTMLVideoElement) => video.currentTime))
    .toBeGreaterThanOrEqual(6);
  await expect(page.getByTestId('active-cue')).toContainText('The train is here.');
  await video.evaluate((video: HTMLVideoElement) => video.requestFullscreen());
  expect(await video.evaluate((video) => document.fullscreenElement === video)).toBe(true);
  expect(await video.evaluate((video: HTMLVideoElement) => video.textTracks[0].mode)).toBe(
    'showing',
  );
  await expect
    .poll(() =>
      video.evaluate((video: HTMLVideoElement) => {
        const cue = video.textTracks[0].activeCues?.[0];
        return cue instanceof VTTCue ? cue.text : '';
      }),
    )
    .toContain('Галт тэрэг');
  mkdirSync('.refactor-evidence/preview', { recursive: true });
  await page.screenshot({ path: '.refactor-evidence/preview/native-caption-fullscreen.png' });
  await page.evaluate(() => document.exitFullscreen());
  await page.getByText('Subtitles', { exact: true }).click();
  await page.getByRole('button', { name: 'Хадмал унтраах', exact: true }).click();
  await expect(video.locator('track')).toHaveCount(0);
  expect(loads).toBe(1);
});

test('watch transport errors offer retry without a payment prompt and recover on a fresh request', async ({
  page,
}) => {
  await dismissPlacement(page);
  let fail = true;
  await page.route('**/api/watch/inception', (route) =>
    fail ? route.abort() : route.fulfill({ json: { allowed: true } }),
  );
  await page.route('https://bingeapi.st/**', (route) => route.abort());
  await page.goto('/watch/inception');
  await expect(page.getByRole('status').filter({ hasText: 'Холболт тасарлаа' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'VIP эрх авах', exact: true })).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Дахин оролдох', exact: true }).click();
  await expect(page.getByTitle('Inception player')).toBeVisible();
});

test('switching watch routes cannot retain another movie access grant or subtitle state', async ({
  page,
}) => {
  await dismissPlacement(page);
  await page.route('**/api/watch/inception', (route) => route.fulfill({ json: { allowed: true } }));
  await page.route('https://bingeapi.st/**', (route) => route.abort());
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/watch/spider-man-brand-new-day', async (route) => {
    await pending;
    await route.fulfill({ status: 402, json: { error: { code: 'SUBSCRIPTION_REQUIRED' } } });
  });
  await page.goto('/watch/inception');
  await expect(page.getByTitle('Inception player')).toBeVisible();
  await page.evaluate(() => {
    const router = Reflect.get(Reflect.get(window, 'next'), 'router');
    router.push('/watch/spider-man-brand-new-day');
  });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Spider-Man: Brand New Day');
  await expect(page.locator('iframe')).toHaveCount(0);
  release?.();
  await expect(
    page.getByRole('heading', { name: 'Кино үзэхэд VIP эрх хэрэгтэй', exact: true }),
  ).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('diagnostics and direct stream requests reject guests before exposing configuration or resolving media', async ({
  request,
}) => {
  expect((await request.get('/api/envtest')).status()).toBe(401);
  expect((await request.get('/api/subtitles/mongolian/constructor')).status()).toBe(404);
  expect((await request.get('/api/stream/tmdb?tmdbId=27205&type=movie')).status()).toBe(401);
  expect(
    (
      await request.post('/api/watch/inception/progress', { data: { watchedSeconds: 3000 } })
    ).status(),
  ).toBe(401);
});
