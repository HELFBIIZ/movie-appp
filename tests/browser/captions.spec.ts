import { expect, test } from '@playwright/test';

test('selected Mongolian caption and on/off control update the normal embed instead of only its label', async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('vxnta.scenechain.placement.dismissed.v1', '1'),
  );
  await page.route('**/api/watch/inception', (route) => route.fulfill({ json: { allowed: true } }));
  await page.route('https://vidsrcme.ru/**', (route) => route.abort());
  await page.route('**/api/subtitles/mongolian/**', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/subtitles?**', (route) =>
    route.fulfill({
      json: { results: [{ fileId: 1, fileName: 'matching-mn-fixture.vtt', language: 'mn' }] },
    }),
  );
  const source = '/api/subtitles/source/12345678-1234-1234-1234-123456789abc';
  await page.route('**/api/subtitles', (route) => route.fulfill({ json: { link: source } }));
  await page.goto('/watch/inception', { waitUntil: 'domcontentloaded' });
  await page.getByText('Subtitles', { exact: true }).click();
  await page.getByRole('button', { name: 'Find Mongolian Subtitles', exact: true }).click();
  await page.getByText('matching-mn-fixture.vtt', { exact: true }).click();
  const frame = page.getByTitle('Inception player');
  await expect(frame).toHaveAttribute('src', new RegExp(encodeURIComponent(source)));
  await page.getByRole('button', { name: 'Хадмал унтраах', exact: true }).click();
  await expect(frame).not.toHaveAttribute('src', /sub_url/);
  await page.getByRole('button', { name: 'Хадмал асаах', exact: true }).click();
  await expect(frame).toHaveAttribute('src', new RegExp(encodeURIComponent(source)));
});
