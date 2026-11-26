import { expect, test } from '@playwright/test';

test('selected Mongolian caption and on/off control update the normal embed instead of only its label', async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('vxnta.scenechain.placement.dismissed.v1', '1'),
  );
  await page.route('**/api/watch/inception', (route) => route.fulfill({ json: { allowed: true } }));
  await page.route('https://bingeapi.st/**', (route) => route.abort());
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

test('instant subtitles use their source URL on an explicit click and automatic selection awards no XP', async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('vxnta.scenechain.placement.dismissed.v1', '1'),
  );
  await page.route('**/api/watch/inception', (route) => route.fulfill({ json: { allowed: true } }));
  await page.route('https://bingeapi.st/**', (route) => route.abort());
  await page.route('**/api/subtitles/mongolian/inception', (route) =>
    route.fulfill({
      contentType: 'text/vtt',
      body: 'WEBVTT\n\n00:01.000 --> 00:04.000\nСайн байна уу!\n',
    }),
  );
  let awards = 0;
  await page.route('**/api/actions/xp', (route) => {
    awards++;
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto('/watch/inception');
  const frame = page.getByTitle('Inception player');
  const expected = encodeURIComponent('/api/subtitles/mongolian/inception');
  await expect(frame).toHaveAttribute('src', new RegExp(expected));
  expect(awards).toBe(0);
  await page.getByText('Subtitles', { exact: true }).click();
  await page.getByRole('button', { name: '🇲🇳 Mongolian', exact: true }).click();
  await expect(frame).not.toHaveAttribute('src', /sub_url/);
  await page.getByRole('button', { name: 'Load Mongolian Subtitles 🇲🇳', exact: true }).click();
  await expect(frame).toHaveAttribute('src', new RegExp(expected));
  await expect(frame).not.toHaveAttribute('src', /object%20Object|object Object/);
  await expect.poll(() => awards).toBe(1);
});
