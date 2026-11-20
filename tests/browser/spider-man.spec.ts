import { expect, test } from '@playwright/test';

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
    page.getByRole('heading', { name: 'This title needs VIP', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Learning Mode', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Movie player', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Sample lesson', exact: true })).toHaveCount(0);
  await expect(page.locator('iframe, video')).toHaveCount(0);
  await expect(page.getByText('Player clock: unavailable', { exact: false })).toBeVisible();
  await expect(
    page.getByText(
      'Кино болон киноны transcript нээхийн өмнө VXNTA-д нэвтэрч, VIP эрхээ баталгаажуулна уу.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/spider-man-guest-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Local video + VTT', exact: true }).click();
  await expect(page.getByLabel('Local video', { exact: true })).toBeVisible();
  await expect(page.getByLabel('English VTT', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Mongolian VTT', { exact: true })).toBeVisible();
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
  await page.getByRole('button', { name: 'Learning Mode', exact: true }).click();
  await page.getByRole('button', { name: 'Player 2 · CineSrc сонгох', exact: true }).click();
  await expect(page.getByText('CineSrc-ээс ирсэн цаг:', { exact: false })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Bilingual transcript' }).locator('li')).toHaveCount(
    50,
  );
  await expect(page.getByText('EN: байхгүй', { exact: false })).toBeVisible();
  const panel = page.locator('#watch-subtitle-panel');
  await panel.getByRole('button', { name: /^Subtitles/ }).click();
  await panel.getByRole('button', { name: /English$/ }).click();
  await panel.getByRole('button', { name: 'Find English Subtitles', exact: true }).click();
  await panel.getByRole('button', { name: /panel-fixture.vtt/ }).click();
  await expect(page.getByTestId('active-cue')).toContainText('Panel fixture');
  await expect(page.getByText('EN: 2 cue', { exact: false })).toBeVisible();
  await page.getByLabel('Кинотой таарах English VTT (browser-local)').setInputFiles({
    name: 'protocol-fixture.en.vtt',
    mimeType: 'text/vtt',
    buffer: Buffer.from(
      'WEBVTT\n\n00:01:12.000 --> 00:01:16.000\nProtocol fixture sentence, not film dialogue.\n',
    ),
  });
  await expect(page.getByTestId('active-cue')).toContainText('Protocol fixture');
  await page.getByRole('button', { name: 'Seek to 01:12', exact: true }).click();
  await expect(page.getByText('seek acknowledged', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Select word protocol', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save Word', exact: true })).toBeDisabled();
  await page.getByLabel('Тухайн өгүүлбэр дэх утга', { exact: true }).fill('Туршилтын протокол');
  await page
    .getByLabel('Дүрмийн тэмдэглэл (сонголттой)', { exact: true })
    .fill('User-entered fixture note');
  await page.getByRole('button', { name: 'Save Word', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved Word', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Save Sentence 01:12', exact: true }).click();
  await page.getByRole('button', { name: 'Word Quiz', exact: true }).click();
  await page.getByRole('button', { name: 'Туршилтын протокол', exact: true }).click();
  await expect(page.getByText('Оноо: 1/1', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Scene Quiz', exact: true }).click();
  await expect(
    page.getByText(
      'Энэ киноны үзэгдэлд тулгасан, нягталсан асуулт алга. Scene Quiz зохиож нэмээгүй.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Learning Mode', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved & Review (2)', exact: true })).toBeVisible();
  await expect(page.getByText('EN: 1 cue', { exact: false })).toBeVisible();
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
