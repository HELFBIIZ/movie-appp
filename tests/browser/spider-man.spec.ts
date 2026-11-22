import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('vxnta.scenechain.placement.dismissed.v1', '1'),
  );
});

const route = '/watch/spider-man-brand-new-day';

test('real Spider-Man route: guest gate, no sample substitution, unknown clock, mobile and local option', async ({
  page,
  request,
}) => {
  // Real deployed/local access endpoint. No mock, account, subscription, film
  // playback or substitute clip is used in this audit.
  const response = await request.post('/api/watch/spider-man-brand-new-day');
  expect(response.status()).toBe(401);
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Spider-Man: Brand New Day');
  await expect(
    page.getByRole('heading', { name: 'Кино үзэхийн тулд нэвтэрнэ үү', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Үг сурах', exact: true }).click();
  const dock = page.getByRole('region', { name: 'SceneChain Learning Dock' });
  await expect(
    dock.getByRole('group', { name: 'Learning panels' }).getByRole('button'),
  ).toHaveCount(3);
  const settings = dock.locator('details').first();
  await expect(settings).not.toHaveAttribute('open');
  await expect(page.getByRole('button', { name: 'Өөрийн видео', exact: true })).toBeHidden();
  await settings.locator('summary').first().click();
  await expect(page.getByRole('button', { name: 'Кино', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Сургалтын жишээ', exact: true })).toHaveCount(0);
  await expect(page.locator('iframe, video')).toHaveCount(0);
  await expect(page.getByText('Тоглуулагчийн цаг:', { exact: false })).toHaveCount(0);
  await expect(
    page.getByText('Хадмалтай сурахын тулд нэвтэрч, VIP эрхээ баталгаажуулна уу.', { exact: true }),
  ).toBeVisible();
  await settings.locator('summary').first().click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/spider-man-guest-mobile.png', fullPage: true });
  await settings.locator('summary').first().click();
  await page.getByRole('button', { name: 'Өөрийн видео', exact: true }).click();
  await expect(page.getByLabel('Видео файл', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Англи хадмал (.vtt)', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Монгол хадмал (.vtt)', { exact: true })).toBeVisible();
});

test('CineSrc protocol fixture validates UI wiring only; this is not film playback verification', async ({
  page,
}) => {
  // Explicit contract fixture, not Spider-Man video, dialogue, licensed media
  // evidence, or a real VIP grant. The independent live audit above is unmocked.
  await page.route('**/api/watch/spider-man-brand-new-day', (route) =>
    route.fulfill({ json: { allowed: true } }),
  );
  await page.route('https://vidsrcme.ru/**', (route) => route.abort());
  const subtitleSource = '/api/subtitles/source/12345678-1234-1234-1234-123456789abc';
  await page.route('**/api/subtitles?**', (route) =>
    route.fulfill({
      json: {
        results: [{ id: 'fixture', fileId: 1, fileName: 'panel-fixture.vtt', language: 'en' }],
      },
    }),
  );
  await page.route('**/api/subtitles', (route) =>
    route.fulfill({ json: { link: subtitleSource } }),
  );
  await page.route('**' + subtitleSource, (route) =>
    route.fulfill({
      contentType: 'text/vtt',
      body: 'WEBVTT\n\n1\n00:01:12.000 --> 00:01:16.000\nPanel fixture, not movie dialogue.\n2\n00:01:20.000 --> 00:01:24.000\nSecond protocol fixture cue.\n',
    }),
  );
  await page.route('https://cinesrc.st/embed/movie/969681', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><title>Protocol fixture, not film</title><script>
    const parentOrigin = ${JSON.stringify(new URL(page.url()).origin)};
    const emit = (data) => parent.postMessage(data, parentOrigin);
    let time = 72.3;
    addEventListener('message', (event) => {
      if (event.source !== parent || event.origin !== parentOrigin || event.data.type !== 'cinesrc:command') return;
      const { command, args } = event.data;
      if (command === 'getDuration') emit({type:'cinesrc:response',command,result:8700});
      if (command === 'getCurrentTime') emit({type:'cinesrc:response',command,result:time});
      if (command === 'pause') emit({type:'cinesrc:pause'});
      if (command === 'seek') {time=args[0];emit({type:'cinesrc:seeked',currentTime:time,duration:8700});}
    });
    emit({type:'cinesrc:ready'});
  </script>`,
    }),
  );
  await page.goto(route);
  await page.getByRole('button', { name: 'Үг сурах', exact: true }).click();
  await expect(page.getByText('Тоглуулагчийн цаг:', { exact: false })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Bilingual transcript' }).locator('li')).toHaveCount(
    20,
  );
  await expect(page.getByText('Англи хадмал нэмэх', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Англи хадмал (.vtt)')).toBeHidden();
  const panel = page.locator('#watch-subtitle-panel');
  await panel.getByRole('button', { name: /^Subtitles/ }).click();
  await panel.getByRole('button', { name: /English$/ }).click();
  await panel.getByRole('button', { name: 'Find English Subtitles', exact: true }).click();
  await panel.getByRole('button', { name: /panel-fixture.vtt/ }).click();
  await expect(page.getByTestId('active-cue')).toContainText('Panel fixture');
  await page.getByText('Хадмалын тохиргоо', { exact: true }).click();
  await expect(page.getByText('Англи: 2 мөр', { exact: false })).toBeVisible();
  await page.getByLabel('Англи хадмал (.vtt)').setInputFiles({
    name: 'protocol-fixture.en.vtt',
    mimeType: 'text/vtt',
    buffer: Buffer.from(
      'WEBVTT\n\n00:01:12.000 --> 00:01:16.000\nProtocol fixture sentence, not film dialogue.\n',
    ),
  });
  await expect(page.getByTestId('active-cue')).toContainText('Protocol fixture');
  await page.getByRole('button', { name: '01:12 руу очих', exact: true }).click();
  await expect(page.getByText('Тоглуулагчийн цаг: 01:12', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Select word protocol', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Үг хадгалах', exact: true })).toBeDisabled();
  await page.getByLabel('Утга', { exact: true }).fill('Туршилтын протокол');
  await page.getByText('Нэмэлт тэмдэглэл', { exact: true }).click();
  await page
    .getByLabel('Дүрмийн тэмдэглэл (сонголттой)', { exact: true })
    .fill('User-entered fixture note');
  await page.getByRole('button', { name: 'Үг хадгалах', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Хадгалсан', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Тайлбарыг хаах', exact: true }).click();
  await page.getByRole('button', { name: 'Өгүүлбэр хадгалах 01:12', exact: true }).click();
  await page.getByRole('button', { name: 'Давтах', exact: true }).click();
  await page.getByRole('button', { name: 'Туршилтын протокол', exact: true }).click();
  await expect(page.getByText('Оноо: 1/1', { exact: false })).toBeVisible();
  await expect(page.locator('summary').filter({ hasText: 'Үзэгдлийн асуулт' })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Үг сурах', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Хадгалсан (2)', exact: true })).toBeVisible();
  await page.getByText('Хадмалын тохиргоо', { exact: true }).click();
  await expect(page.getByText('Англи: 1 мөр', { exact: false })).toBeVisible();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('vxnta.scenechain.v1')!));
  expect(data.items.find((item: { kind: string }) => item.kind === 'word')).toMatchObject({
    movieId: 'spider-man-brand-new-day',
    tmdbId: 969681,
    provenance: 'user-note',
    grammar: 'User-entered fixture note',
    cueStart: 72,
    correct: 1,
  });
  await page.screenshot({ path: 'test-results/spider-man-protocol-fixture.png', fullPage: true });
});
