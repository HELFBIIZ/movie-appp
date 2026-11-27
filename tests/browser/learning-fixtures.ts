import { expect, type Page } from '@playwright/test';
import { emptySnapshot } from '../../src/lib/learning/snapshot';

export async function dismissPlacement(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem('vxnta.scenechain.placement.dismissed.v1', '1'),
  );
}
// Original, locally authored media is a browser-test fixture, never a replacement movie.
export async function openLocal(page: Page, en?: string, mn: string | false = false) {
  await dismissPlacement(page);
  await page.route('**/api/watch/inception', (route) =>
    route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } }),
  );
  await page.goto('/watch/inception?learn=1&media=local', { waitUntil: 'domcontentloaded' });
  await page
    .getByLabel('Видео файл', { exact: true })
    .setInputFiles('tests/fixtures/last-train.webm');
  await page
    .getByLabel('Англи хадмал (.vtt)', { exact: true })
    .setInputFiles(
      en
        ? { name: 'test.en.vtt', mimeType: 'text/vtt', buffer: Buffer.from(en) }
        : 'tests/fixtures/last-train.en.vtt',
    );
  if (mn)
    await page
      .getByLabel('Монгол хадмал (.vtt) — сонголттой', { exact: true })
      .setInputFiles({ name: 'test.mn.vtt', mimeType: 'text/vtt', buffer: Buffer.from(mn) });
  await page.getByRole('button', { name: 'Видеогоо нээх', exact: true }).click();
  const video = page.getByLabel('Өөрийн видео', { exact: true });
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThan(0);
  await video.evaluate((element: HTMLVideoElement) => {
    element.muted = true;
  });
  return video;
}
export async function seedWords(page: Page) {
  const snapshot = emptySnapshot();
  snapshot.progress.items = ['last', 'train'].map((word, index) => ({
    id: `review-${word}`,
    kind: 'word',
    word,
    meaning: index ? 'галт тэрэг' : 'сүүлчийн',
    example: 'The last train leaves in ten minutes.',
    movieId: 'inception',
    mediaId: 'review-fixture',
    cueStart: 1,
    cueEnd: 4,
    savedAt: 1 + index,
    dueAt: 1 + index,
    correct: 0,
    incorrect: 0,
    stage: 0,
    provenance: 'curated',
  }));
  await page.addInitScript((value) => {
    if (!localStorage.getItem('vxnta.learning.guest.v2'))
      localStorage.setItem(
        'vxnta.learning.guest.v2',
        JSON.stringify({ revision: 0, dirty: false, snapshot: value }),
      );
  }, snapshot);
}
