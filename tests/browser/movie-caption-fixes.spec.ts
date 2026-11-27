import { expect, test, type Page } from '@playwright/test';
import { dismissPlacement } from './learning-fixtures';

const captions = {
  english: 'WEBVTT\n\n00:01.000 --> 00:04.000\nWe can try again.\n',
  mongolian: 'WEBVTT\n\n00:01.000 --> 00:04.000\nБид дахин оролдож болно.\n',
  notice: 'Original test fixture, not movie dialogue.',
};
const legacy = {
  english: 'WEBVTT\n\n00:01.000 --> 00:04.000\nThe door is open.\n',
  mongolian: 'WEBVTT\n\n00:01.000 --> 00:04.000\nХаалга онгорхой байна.\n',
  enOffset: 0,
  mnOffset: 0,
};
async function prepare(page: Page, slug: string) {
  await dismissPlacement(page);
  await page.route(`**/api/watch/${slug}`, (route) => route.fulfill({ json: { allowed: true } }));
  await page.route('**/api/learning/subtitles?**', (route) => route.fulfill({ json: captions }));
  // No third-party film is loaded; this tests our subtitle integration only.
  for (const origin of ['https://cinesrc.st/**', 'https://bingeapi.st/**'])
    await page.route(origin, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>Protocol fixture</title>' }),
    );
}

for (const slug of ['spider-man-brand-new-day', 'inception']) {
  test(`${slug}: stale automatic tracks refresh without losing a manually selected track`, async ({
    page,
  }) => {
    await prepare(page, slug);
    const key = `vxnta.scenechain.captions.${slug}.v2`;
    await page.addInitScript(
      ({ key, saved }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(saved));
      },
      { key, saved: { ...legacy, englishSource: 'automatic', mongolianSource: 'manual' } },
    );
    await page.goto(`/watch/${slug}?learn=1`);
    const practice = page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' });
    await expect(practice).toContainText('We can try again.');
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
    expect(saved.english).toBe(captions.english);
    expect(saved.mongolian).toBe(legacy.mongolian);
    expect(saved.mongolianSource).toBe('manual');
  });
}

test('legacy caption replacement keeps a backup and corrected sentence meaning survives reload', async ({
  page,
}) => {
  await prepare(page, 'inception');
  const key = 'vxnta.scenechain.captions.inception.v2';
  await page.addInitScript(
    ({ key, saved }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(saved));
    },
    { key, saved: legacy },
  );
  await page.goto('/watch/inception?learn=1');
  const practice = page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' });
  await expect(practice).toContainText('The door is open.');
  await page.getByText('Хадмал тааруулах', { exact: true }).click();
  await page.getByRole('button', { name: 'Сайтын хадмалыг дахин авах', exact: true }).click();
  await expect(practice).toContainText('We can try again.');
  expect(
    await page.evaluate(
      (key) =>
        Object.keys(localStorage)
          .filter((name) => name.startsWith(`${key}.backup.`))
          .map((name) => JSON.parse(localStorage.getItem(name)!)),
      key,
    ),
  ).toEqual([expect.objectContaining({ english: legacy.english, mongolian: legacy.mongolian })]);
  await practice.getByRole('button', { name: 'Утга таарахгүй байна', exact: true }).click();
  await page.route('**/api/learning/sentence', (route) =>
    route.fulfill({ json: { translation: 'Дахиад нэг оролдоод үзье.' } }),
  );
  await practice.getByRole('button', { name: 'Монгол утгыг үзэх', exact: true }).click();
  await expect(practice).toContainText('Дахиад нэг оролдоод үзье.');
  await page.reload();
  await expect(practice).toContainText('Дахиад нэг оролдоод үзье.');
  await expect(practice).not.toContainText(captions.mongolian.split('\n')[3]);
});
