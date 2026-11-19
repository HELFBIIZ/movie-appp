import { expect, test } from '@playwright/test';

const route = '/watch/inception';
test.beforeEach(async ({ page }) => {
  await page.route('**/api/subtitles/**', (request) => request.fulfill({ status: 404, body: '' }));
  // Only mock the read/access response, never create users, subscriptions or XP.
  await page.route('**/api/watch/inception', (request) =>
    request.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } }),
  );
  await page.goto(route);
});

test('real watch access endpoint still rejects an unauthenticated viewer', async ({ request }) => {
  const response = await request.post('/api/watch/inception');
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe('UNAUTHENTICATED');
});

test('local video and VTT stay in the browser and untrusted captions are plain text', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Learning Mode', exact: true }).click();
  await page.getByRole('button', { name: 'Local video + VTT', exact: true }).click();
  await page
    .getByLabel('Local video', { exact: true })
    .setInputFiles('public/learning/last-train.webm');
  await page.getByLabel('English VTT', { exact: true }).setInputFiles({
    name: 'local.en.vtt',
    mimeType: 'text/vtt',
    buffer: Buffer.from(
      'WEBVTT\n\n00:01.000 --> 00:04.000\n<script>window.__captionInjected=true</script><b>The last train.</b> &lt;img onerror=evil&gt;\n',
    ),
  });
  await page.getByLabel('Mongolian VTT', { exact: true }).setInputFiles({
    name: 'local.mn.vtt',
    mimeType: 'text/vtt',
    buffer: Buffer.from('WEBVTT\n\n00:01.000 --> 00:04.000\nСүүлчийн галт тэрэг.\n'),
  });
  await page.getByRole('button', { name: 'Local lesson нээх', exact: true }).click();
  const video = page.getByLabel('Local lesson video', { exact: true });
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThan(0);
  expect(await video.getAttribute('src')).toMatch(/^blob:/);
  await page.getByRole('button', { name: 'Seek to 00:01', exact: true }).click();
  await expect(page.getByTestId('active-cue')).toContainText('The last train. <img onerror=evil>');
  expect(await page.evaluate(() => '__captionInjected' in window)).toBe(false);
  await expect(page.getByRole('button', { name: /Explain / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save Sentence 00:01', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved & Review (1)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Scene Quiz', exact: true }).click();
  await expect(
    page.getByText('Scene Quiz нь зөвхөн The Last Train sample-ийн бодит үйл явдалд зориулагдсан.'),
  ).toBeVisible();
});

test('corrupt stored data is reported without silently replacing existing data', async ({
  page,
}) => {
  await page.evaluate(() => localStorage.setItem('vxnta.scenechain.v1', '{broken'));
  await page.getByRole('button', { name: 'Learning Mode', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'SceneChain Learning Dock' }).getByRole('alert'),
  ).toContainText('Browser storage уншиж чадсангүй');
  await expect(
    page.getByRole('button', { name: 'Save Sentence 00:01', exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('vxnta.scenechain.v1'))).toBe('{broken');
});

test('normal watch gate remains intact and sample works inside the same route', async ({
  page,
}) => {
  await expect(page.getByRole('heading', { name: 'This title needs VIP' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'SceneChain Learning Dock' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Learning Mode', exact: true }).click();
  await expect(page.getByRole('region', { name: 'SceneChain Learning Dock' })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${route}$`));
  const video = page.getByLabel('The Last Train sample lesson video');
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThan(0);
  await video.evaluate(async (element: HTMLVideoElement) => {
    element.currentTime = 1.5;
    element.muted = true;
    await element.play();
  });
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(1.5);
  await video.evaluate((element: HTMLVideoElement) => {
    element.pause();
    element.currentTime = 1.5;
  });
  await expect(page.getByTestId('active-cue').first()).toContainText('The last train');
  await expect(page.getByTestId('active-cue').first()).toContainText('Сүүлчийн галт тэрэг');
  await expect(page.getByRole('button', { name: 'Seek to 00:07' })).toBeEnabled();
  await page.getByRole('button', { name: 'Seek to 00:07' }).click();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThanOrEqual(7);
  await page.getByRole('button', { name: 'Explain ticket', exact: true }).first().click();
  await expect(page.getByRole('region', { name: 'Word explanation' })).toContainText('тасалбар');
  await page.getByRole('button', { name: 'Save Word', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved Word', exact: true })).toBeDisabled();
  await page.screenshot({ path: 'test-results/scenechain-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Save Sentence 00:07', exact: true }).click();
  await page.getByRole('button', { name: 'Word Quiz', exact: true }).click();
  await page.getByRole('button', { name: 'тасалбар', exact: true }).click();
  await expect(page.getByText('Оноо: 1/1')).toBeVisible();
  await page.getByRole('button', { name: 'Scene Quiz', exact: true }).click();
  await page.getByRole('button', { name: 'Лео галт тэрэг жолооддог байсан.', exact: true }).click();
  await expect(page.getByText('Оноо: 0/1')).toBeVisible();
  await page.getByRole('button', { name: 'Saved & Review (2)', exact: true }).click();
  await page.getByRole('button', { name: 'Утгыг харах / Review' }).click();
  await page.getByRole('button', { name: 'Мартсан', exact: true }).click();
  await expect(page.getByText('SRS: 10 минутын дараа дахин давтана.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Learning Mode', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved & Review (2)', exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('vxnta.scenechain.v1')!));
  expect(saved.items).toHaveLength(2);
  expect(saved.items.find((item: { kind: string }) => item.kind === 'word').correct).toBe(1);
  expect(saved.contextIncorrect).toBe(1);
  await page.getByRole('button', { name: 'Movie player', exact: true }).click();
  await expect(page.getByText('Sync unavailable for this player', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This title needs VIP' })).toBeVisible();
  await page.getByRole('button', { name: 'Normal', exact: true }).click();
  await expect(page.getByRole('region', { name: 'SceneChain Learning Dock' })).toHaveCount(0);
});

test('authorized normal watch retains five iframe providers; sample never claims iframe sync', async ({
  page,
}) => {
  await page.route('**/api/watch/inception', (request) =>
    request.fulfill({ json: { allowed: true } }),
  );
  await page.route(
    /https:\/\/(vidsrcme|cinesrc|multiembed|embedmaster|watch\.embed-api)\./,
    (request) => request.abort(),
  );
  await page.reload();
  await expect(page.getByTitle('Inception player')).toBeVisible();
  await expect(page.getByRole('button', { name: /Player [1-5] ·/ })).toHaveCount(5);
  await page.getByRole('button', { name: 'Learning Mode', exact: true }).click();
  await expect(page.getByTitle('Inception player')).toHaveCount(0);
  await page.getByRole('button', { name: 'Movie player', exact: true }).click();
  await expect(page.getByTitle('Inception player')).toBeVisible();
  await page.getByRole('button', { name: 'Normal', exact: true }).click();
  await expect(page.getByTitle('Inception player')).toBeVisible();
});

test('mobile layout fits viewport and storage failures do not report saved success', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Learning Mode', exact: true }).click();
  await page.getByRole('button', { name: 'Explain train', exact: true }).first().click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Save Word', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'SceneChain Learning Dock' }).getByRole('alert'),
  ).toContainText('Хадгалж чадсангүй');
  await expect(page.getByRole('button', { name: 'Save Word', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'test-results/scenechain-mobile.png', fullPage: true });
  const layout = await page.evaluate(() => ({
    width: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
    overflow: Array.from(document.querySelectorAll('body *'))
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 10)
      .map((element) => ({
        tag: element.tagName,
        class: element.className,
        right: element.getBoundingClientRect().right,
      })),
  }));
  expect(layout.scroll, JSON.stringify(layout.overflow)).toBeLessThanOrEqual(layout.width);
});
