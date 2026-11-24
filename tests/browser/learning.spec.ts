import { expect, test } from '@playwright/test';
import { dismissPlacement, openLocal } from './learning-fixtures';

test('watch access still rejects guests and the native login remains available', async ({
  request,
}) => {
  const response = await request.post('/api/watch/inception');
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe('UNAUTHENTICATED');
  expect(await (await request.get('/login')).text()).toContain('Имэйл эсвэл хэрэглэгчийн нэр');
  expect((await request.get('/api/learning/word?word=train')).status()).toBe(401);
});

test('EN-only local media works, captions are plain text and no private video is uploaded', async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && !request.url().includes('/api/watch/'))
      uploads.push(request.url());
  });
  const video = await openLocal(
    page,
    'WEBVTT\n\n00:01.000 --> 00:04.000\n<script>window.__captionInjected=true</script><b>The last train.</b> &lt;img onerror=evil&gt;\n',
  );
  expect(await video.getAttribute('src')).toMatch(/^blob:/);
  await expect(page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' })).toContainText(
    'The last train. <img onerror=evil>',
  );
  expect(await page.evaluate(() => '__captionInjected' in window)).toBe(false);
  expect(uploads).toEqual([]);
});

test('corrupt storage remains untouched and cannot claim a saved word', async ({ page }) => {
  await dismissPlacement(page);
  await page.addInitScript(() => localStorage.setItem('vxnta.scenechain.v1', '{broken'));
  await openLocal(page);
  await expect(
    page.getByRole('region', { name: 'SceneChain Learning Dock' }).getByRole('alert'),
  ).toContainText('Browser storage уншиж чадсангүй');
  await page.getByRole('button', { name: 'last — утгыг харах', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Энэ үгийг суръя', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('vxnta.scenechain.v1'))).toBe('{broken');
});

test('authorized watch retains five providers and local learning never claims an iframe clock', async ({
  page,
}) => {
  await dismissPlacement(page);
  await page.route('**/api/watch/inception', (route) => route.fulfill({ json: { allowed: true } }));
  await page.route(
    /https:\/\/(vidsrcme|cinesrc|multiembed|embedmaster|watch\.embed-api)\./,
    (route) => route.abort(),
  );
  await page.goto('/watch/inception');
  await expect(page.getByTitle('Inception player')).toBeVisible();
  const providers = page.getByRole('combobox', { name: 'Тоглуулагч', exact: true });
  await expect(providers.getByRole('option')).toHaveCount(5);
  await providers.selectOption('cine');
  await expect(page.getByTitle('Inception player')).toHaveAttribute('src', /cinesrc\.st/);
  await page.getByRole('button', { name: 'Үг сурах', exact: true }).click();
  const settings = page
    .getByRole('region', { name: 'SceneChain Learning Dock' })
    .locator('details')
    .first();
  await settings.locator('summary').first().click();
  await settings.getByRole('button', { name: 'Өөрийн видео', exact: true }).click();
  await expect(page.getByTitle('Inception player')).toHaveCount(0);
  await settings.getByRole('button', { name: 'Кино', exact: true }).click();
  await expect(page.getByTitle('Inception player')).toBeVisible();
  await page.getByRole('button', { name: 'Кино үзэх', exact: true }).click();
  await expect(page.getByTitle('Inception player')).toBeVisible();
});

test('mobile word coach fits 390px and storage failure cannot advance to the quiz', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLocal(page);
  await page.getByRole('button', { name: 'train — утгыг харах', exact: true }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Энэ үгийг суръя', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Хадгалж чадсангүй');
  await expect(page.getByRole('button', { name: 'Энэ үгийг суръя', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
