import { expect, test } from '@playwright/test';
import { dismissPlacement } from './learning-fixtures';

test.beforeEach(async ({ page }) => {
  await dismissPlacement(page);
});
const watch = '/watch/spider-man-brand-new-day';

test('real Spider-Man guest gate stays intact, with no sample film or free exercise', async ({
  page,
  request,
}) => {
  expect((await request.post('/api/watch/spider-man-brand-new-day')).status()).toBe(401);
  await page.goto(watch);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Spider-Man: Brand New Day');
  await expect(
    page.getByRole('heading', { name: 'Кино үзэхийн тулд нэвтэрнэ үү', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Үг сурах', exact: true }).click();
  const dock = page.getByRole('region', { name: 'SceneChain Learning Dock' });
  await expect(dock.getByRole('group', { name: 'Сурах хэсэг' }).getByRole('button')).toHaveCount(3);
  await expect(page.locator('iframe, video')).toHaveCount(0);
  await expect(page.locator('a[href="/learn"]')).toHaveCount(0);
  await expect(dock).toContainText('Киноны эрхээ нээгээд');
  const settings = dock.locator('details').first();
  await expect(settings).not.toHaveAttribute('open');
  await settings.locator('summary').click();
  await expect(dock.getByRole('button', { name: 'Сургалтын жишээ', exact: true })).toHaveCount(0);
  await dock.getByRole('button', { name: 'Өөрийн видео', exact: true }).click();
  await expect(page.getByLabel('Монгол хадмал (.vtt) — сонголттой', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('CineSrc contract fixture wires movie captions, real clock ACK and ready word teaching; not film verification', async ({
  page,
  baseURL,
}) => {
  await page.route('**/api/watch/spider-man-brand-new-day', (route) =>
    route.fulfill({ json: { allowed: true } }),
  );
  await page.route('**/api/learning/subtitles?**', (route) =>
    route.fulfill({
      json: {
        english:
          'WEBVTT\n\n00:01:12.000 --> 00:01:16.000\nThe train is here.\n\n00:01:20.000 --> 00:01:24.000\nI need help.\n',
        mongolian:
          'WEBVTT\n\n00:01:12.000 --> 00:01:16.000\nГалт тэрэг энд байна.\n\n00:01:20.000 --> 00:01:24.000\nНадад тусламж хэрэгтэй.\n',
        notice: 'Original contract fixture. Not movie dialogue.',
      },
    }),
  );
  await page.route('https://cinesrc.st/embed/movie/969681', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><title>Protocol fixture, not film</title><script>
    const parentOrigin = ${JSON.stringify(new URL(baseURL!).origin)};
    const emit = (data) => parent.postMessage(data, parentOrigin);
    let time = 72.3;
    addEventListener('message', (event) => {
      if (event.source !== parent || event.origin !== parentOrigin || event.data.type !== 'cinesrc:command') return;
      const {command,args} = event.data;
      if(command==='getDuration') emit({type:'cinesrc:response',command,result:8700});
      if(command==='getCurrentTime') emit({type:'cinesrc:response',command,result:time});
      if(command==='pause') emit({type:'cinesrc:pause'});
      if(command==='seek'){time=args[0];emit({type:'cinesrc:seeked',currentTime:time,duration:8700});}
    }); emit({type:'cinesrc:ready'});
  </script>`,
    }),
  );
  await page.goto(watch + '?learn=1');
  await expect(page.getByTestId('active-cue')).toContainText('The train is here.');
  await page.getByText('Хадмал тааруулах', { exact: true }).click();
  await expect(page.getByText('Киноны хугацаа: 01:12', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'train — утгыг харах', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Үгийн тайлбар' });
  await expect(dialog).toContainText('галт тэрэг');
  await dialog.getByRole('button', { name: 'Энэ үгийг суръя', exact: true }).click();
  await dialog.getByRole('button', { name: 'галт тэрэг', exact: true }).click();
  await page.getByRole('button', { name: 'Тайлбарыг хаах', exact: true }).click();
  await page.getByRole('button', { name: 'Бүх хадмал', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Хадмалын жагсаалт' }).locator('li')).toHaveCount(2);
  await page.getByRole('button', { name: '01:12 руу очих', exact: true }).click();
  await expect(page.getByText('Киноны хугацаа: 01:12', { exact: true })).toBeVisible();
  await page.getByLabel('Англи хадмал (.vtt)').setInputFiles({
    name: 'contract.en.vtt',
    mimeType: 'text/vtt',
    buffer: Buffer.from('WEBVTT\n\n00:01:12.000 --> 00:01:16.000\nThe train is here again.\n'),
  });
  await expect(page.getByRole('list', { name: 'Хадмалын жагсаалт' })).toContainText(
    'The train is here again.',
  );
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('vxnta.scenechain.v1')!).items[0],
  );
  expect(saved).toMatchObject({
    movieId: 'spider-man-brand-new-day',
    tmdbId: 969681,
    word: 'train',
    provenance: 'curated',
    cueStart: 72,
    correct: 1,
  });
  expect(saved.mediaId).toMatch(/^movie:969681:/);
});
