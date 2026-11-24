import { expect, test } from '@playwright/test';
import { placementQuestions } from '../../src/lib/learning/placement';
import { emptySnapshot } from '../../src/lib/learning/snapshot';

test('first entry offers eight questions, persists recommendations and retest history on dashboard', async ({
  page,
}) => {
  await page.goto('/learning', { waitUntil: 'domcontentloaded' });
  const dialog = page.getByRole('dialog', { name: 'Эхлэх түвшний тест' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Тестээ эхлэх' }).click();
  for (let index = 0; index < placementQuestions.length; index++) {
    await dialog
      .getByRole('button', { name: placementQuestions[index].answer, exact: true })
      .click();
    await dialog
      .getByRole('button', {
        name: index === 7 ? 'Үр дүнгээ харах' : 'Дараагийн асуулт',
        exact: true,
      })
      .click();
  }
  await expect(dialog.getByText('Зөв хариулт: 8 / 8')).toBeVisible();
  await dialog.getByRole('button', { name: 'Түвшний тестийг хаах' }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('Дунд · 8/8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Түвшнээ дахин шалгах', exact: true }).click();
  await dialog.getByRole('button', { name: 'Тестээ эхлэх' }).click();
  for (let index = 0; index < 8; index++) {
    await dialog.getByRole('button', { name: 'Мэдэхгүй · Алгасах' }).click();
    await dialog
      .getByRole('button', {
        name: index === 7 ? 'Үр дүнгээ харах' : 'Дараагийн асуулт',
        exact: true,
      })
      .click();
  }
  await dialog.getByRole('button', { name: 'Түвшний тестийг хаах' }).click();
  await expect(page.getByText('Эхний тест: 8/8 → Сүүлийн тест: 0/8')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/learning-dashboard-mobile.png', fullPage: true });
});

test('entry test can be dismissed; payment and sign-in pages never force it', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('dialog', { name: 'Эхлэх түвшний тест' })).not.toBeVisible();
  await page.goto('/learning', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Дараа үзье' }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('dialog', { name: 'Эхлэх түвшний тест' })).not.toBeVisible();
  await page.getByRole('button', { name: '2 минутын түвшний тест' }).click();
  await expect(page.getByRole('dialog', { name: 'Эхлэх түвшний тест' })).toBeVisible();
});

for (const title of [
  { slug: 'inception', tmdbId: 27205, name: 'Inception' },
  { slug: 'yellowstone', tmdbId: 73586, name: 'Yellowstone' },
]) {
  test(`all-title learning uses ${title.name} captions and scoped notes; protocol fixture is not film playback`, async ({
    page,
  }) => {
    await page.addInitScript(() =>
      sessionStorage.setItem('vxnta.scenechain.placement.dismissed.v1', '1'),
    );
    await page.route('**/api/watch/**', (route) => route.fulfill({ json: { allowed: true } }));
    await page.route('**/api/subtitles/mongolian/**', (route) => route.fulfill({ status: 404 }));
    const episodeQueries: string[] = [];
    await page.route('**/api/learning/subtitles?**', (route) => {
      const query = new URL(route.request().url()).searchParams;
      episodeQueries.push(query.get('episode') ?? '');
      return route.fulfill({
        json: {
          english: `WEBVTT\n\n00:01.000 --> 00:05.000\nOriginal fixture episode ${query.get('episode')}.\n`,
          mongolian: 'WEBVTT\n\n00:01.000 --> 00:05.000\nСургалтын туршилтын өгүүлбэр.\n',
          notice: 'Protocol fixture, not movie dialogue.',
        },
      });
    });
    await page.route('https://vidsrcme.ru/**', (route) => route.abort());
    await page.route('https://cinesrc.st/embed/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><title>Protocol fixture</title><script>addEventListener('message',event=>{if(event.source!==parent||event.data.type!=='cinesrc:command')return;const command=event.data.command;if(command==='getDuration'||command==='getCurrentTime')parent.postMessage({type:'cinesrc:response',command,result:command==='getDuration'?100:2},event.origin);});</script>`,
      }),
    );
    await page.goto(`/watch/${title.slug}?learn=1`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Хадмал', exact: true }).click();
    await expect(page.getByLabel('The Last Train sample lesson video')).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Bilingual transcript' })).toContainText(
      'Original fixture episode 1.',
    );
    await expect(page.getByText('Тоглуулагчийн цаг: 00:02', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Select word original', exact: true }).click();
    await page.getByLabel('Утга', { exact: true }).fill('өөрийн сургалтын тэмдэглэл');
    await page.getByRole('button', { name: 'Үг хадгалах', exact: true }).click();
    await page.getByRole('button', { name: 'Тайлбарыг хаах', exact: true }).click();
    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem('vxnta.scenechain.v1')!).items[0],
    );
    expect(saved.movieId).toBe(title.slug);
    expect(saved.tmdbId).toBe(title.tmdbId);
    if (title.slug === 'yellowstone') {
      expect(saved.mediaId).toMatch(/^tv:73586:1:1:/);
      await page.getByLabel('Episode', { exact: true }).selectOption('2');
      await page.getByRole('button', { name: 'Хадмал', exact: true }).click();
      await expect(page.getByRole('list', { name: 'Bilingual transcript' })).toContainText(
        'Original fixture episode 2.',
      );
      expect(episodeQueries).toContain('2');
      expect(await page.getByTitle('Yellowstone player').getAttribute('src')).toContain('?s=1&e=2');
    } else expect(saved.mediaId).toMatch(/^movie:27205:/);
  });
}

test('Wire hosted checkout return polls server confirmation then links back to the requested learning movie; no charge', async ({
  page,
  baseURL,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('vxnta.scenechain.placement.dismissed.v1', '1'),
  );
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      json: {
        me: { id: 'payment-ui-fixture', username: 'learner', roleCode: 'USER', subscription: null },
      },
    }),
  );
  await page.route('**/api/learning/state', (route) =>
    route.fulfill({ json: { revision: 0, snapshot: emptySnapshot() } }),
  );
  await page.route('**/api/payment-options', (route) =>
    route.fulfill({ json: { bank: true, wire: true, qpay: false, demo: false } }),
  );
  const txn = 'tx_12345678-1234-1234-1234-123456789abc';
  const destination = '/watch/inception?learn=1';
  await page.route('**/api/plans', (route) =>
    route.fulfill({
      json: {
        plans: [
          {
            id: 'plan-fixture',
            code: 'MONTHLY',
            name: 'Monthly Unlimited',
            priceMnt: 5900,
            durationDays: 30,
          },
        ],
      },
    }),
  );
  await page.route('**/api/checkout', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      planCode: 'MONTHLY',
      provider: 'wire',
      returnTo: destination,
    });
    expect(route.request().headers()['idempotency-key']).toMatch(/^[a-f0-9-]{36}$/);
    await route.fulfill({
      json: {
        ok: true,
        payment: { txnId: txn, status: 'PENDING' },
        wire: { checkoutUrl: 'https://pay.wire.mn/c/cs_fixture' },
      },
    });
  });
  const back = `${baseURL}/pricing?${new URLSearchParams({ txn, returnTo: destination })}`;
  await page.route('https://pay.wire.mn/c/cs_fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><title>Mock hosted checkout, no charge</title><a href="${back.replaceAll('&', '&amp;')}">Return fixture payment</a>`,
    }),
  );
  let paid = false;
  await page.route(`**/api/payments/${txn}`, (route) =>
    route.fulfill({
      json: {
        payment: { status: paid ? 'SUCCESSFUL' : 'PENDING' },
        subscription: paid ? { expiresAt: '2027-01-01T00:00:00Z' } : null,
      },
    }),
  );
  await page.goto(`/pricing?returnTo=${encodeURIComponent(destination)}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('button', { name: 'Buy with card (demo)' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Wire-ээр төлөх ₮5,900' }).click();
  await page.getByRole('link', { name: 'Return fixture payment' }).click();
  await expect(page.getByRole('region', { name: 'Wire төлбөрийн төлөв' })).toContainText(
    'Төлбөр хүлээгдэж байна',
  );
  await expect(page.getByRole('link', { name: 'Киногоо үзэж, суралцах →' })).toHaveCount(0);
  paid = true;
  await page.getByRole('button', { name: 'Төлбөрөө дахин шалгах' }).click();
  await expect(page.getByRole('link', { name: 'Киногоо үзэж, суралцах →' })).toHaveAttribute(
    'href',
    destination,
  );
});

test('new learning and payment endpoints retain real guest and admin guards', async ({
  request,
}) => {
  for (const path of [
    '/api/learning/state',
    '/api/learning/subtitles?slug=inception',
    '/api/payments/wire/pending',
    '/api/payments/tx_12345678-1234-1234-1234-123456789abc',
  ])
    expect((await request.get(path)).status()).toBe(401);
  expect((await request.post('/api/admin/learning-subtitles', { data: {} })).status()).toBe(401);
  expect((await request.post('/api/subtitles/translate', { data: {} })).status()).toBe(401);
  const options = await (await request.get('/api/payment-options')).json();
  expect(options.demo).toBe(false);
});

test('real local accounts keep separate server progress, reject stale writes and production demo grants', async ({
  playwright,
  baseURL,
}) => {
  test.skip(
    !baseURL || !['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname),
    'Disposable local/CI database only; never create production accounts.',
  );
  const first = await playwright.request.newContext({ baseURL });
  const second = await playwright.request.newContext({ baseURL });
  const register = async (client: typeof first) => {
    const identifier = `test${crypto.randomUUID().replaceAll('-', '').slice(0, 15)}`;
    const password = `Fixture1!${crypto.randomUUID()}`;
    expect(
      (
        await client.post('/api/auth/register', {
          data: { email: `${identifier}@example.test`, username: identifier, password },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await client.post('/api/auth/login', { data: { identifier, password } })).status(),
    ).toBe(200);
  };
  try {
    await register(first);
    await register(second);
    const snapshot = {
      ...emptySnapshot(),
      progress: { items: [], contextCorrect: 1, contextIncorrect: 0 },
    };
    const saved = await first.put('/api/learning/state', {
      data: { revision: 0, snapshot, userId: 'ignored-client-user-id' },
    });
    expect(saved.status()).toBe(200);
    expect(
      (await first.put('/api/learning/state', { data: { revision: 0, snapshot } })).status(),
    ).toBe(409);
    expect(
      (await (await second.get('/api/learning/state')).json()).snapshot.progress.contextCorrect,
    ).toBe(0);
    expect(
      (await (await first.get('/api/learning/state')).json()).snapshot.progress.contextCorrect,
    ).toBe(1);
    expect(
      (
        await first.put('/api/learning/state', {
          data: {
            revision: 1,
            snapshot: { ...snapshot, assessments: [{ answers: {}, completedAt: 1 }] },
          },
        })
      ).status(),
    ).toBe(400);
    expect((await first.post('/api/admin/learning-subtitles', { data: {} })).status()).toBe(403);
    expect(
      (
        await first.post('/api/checkout', { data: { planCode: 'MONTHLY', provider: 'local_dev' } })
      ).status(),
    ).toBe(403);
    expect(
      (await first.get('/api/payments/tx_12345678-1234-1234-1234-123456789abc')).status(),
    ).toBe(404);
  } finally {
    await first.dispose();
    await second.dispose();
  }
});
