import { expect, test } from '@playwright/test';
import { openLocal } from './learning-fixtures';

test('sentence meaning is on demand, returns to the word lesson and reuses the learned sentence', async ({
  page,
}) => {
  let calls = 0;
  const paidRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/api\/(?:checkout|subtitles\/translate)/.test(request.url()))
      paidRequests.push(request.url());
  });
  await page.route('**/api/learning/sentence', (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({
      text: 'The last train leaves in ten minutes.',
    });
    return route.fulfill({
      json: { translation: 'Сүүлчийн галт тэрэг арван минутын дараа хөдөлнө.', source: 'mymemory' },
    });
  });
  await openLocal(page);
  const practice = page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' });
  expect(calls).toBe(0);
  await practice.getByRole('button', { name: 'Монгол утгыг үзэх', exact: true }).click();
  await expect(practice).toContainText('Сүүлчийн галт тэрэг арван минутын дараа хөдөлнө.');
  await expect(practice).toContainText('Автомат утга · MyMemory');
  await practice.getByRole('button', { name: 'last — утгыг харах', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Үгийн тайлбар' })).toContainText(
    'Сүүлчийн галт тэрэг арван минутын дараа хөдөлнө.',
  );
  await page.keyboard.press('Escape');
  await practice.getByRole('button', { name: 'Дараагийн өгүүлбэр', exact: true }).click();
  await practice.getByRole('button', { name: 'Өмнөх өгүүлбэр', exact: true }).click();
  await expect(practice).toContainText('Сүүлчийн галт тэрэг');
  expect(calls).toBe(1);
  expect(paidRequests).toEqual([]);
});

test('free limit and guest guards do not call a paid provider or show false subtitles', async ({
  page,
  request,
}) => {
  expect(
    (await request.post('/api/learning/sentence', { data: { text: 'Hello!' } })).status(),
  ).toBe(401);
  await page.route('**/api/learning/sentence', (route) =>
    route.fulfill({ status: 429, json: { error: { code: 'FREE_LIMIT_REACHED' } } }),
  );
  await openLocal(page);
  const practice = page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' });
  await practice.getByRole('button', { name: 'Монгол утгыг үзэх', exact: true }).click();
  await expect(practice.getByRole('status')).toContainText('Өнөөдрийн үнэгүй хязгаарт хүрлээ');
  await expect(practice.locator('[lang="mn"]')).toHaveCount(0);
  await expect(
    practice.getByRole('button', { name: 'train — утгыг харах', exact: true }),
  ).toBeEnabled();
});

test('an existing Mongolian cue needs no external request', async ({ page }) => {
  let calls = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/learning/sentence')) calls++;
  });
  await openLocal(
    page,
    'WEBVTT\n\n00:01.000 --> 00:04.000\nHello there!\n',
    'WEBVTT\n\n00:01.000 --> 00:04.000\nСайн байна уу!\n',
  );
  await expect(page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' })).toContainText(
    'Сайн байна уу!',
  );
  await expect(page.getByRole('button', { name: 'Монгол утгыг үзэх', exact: true })).toHaveCount(0);
  expect(calls).toBe(0);
});

test('a wrong provided meaning can be replaced from the actual English line and stays corrected', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/learning/sentence', (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ text: 'The train leaves soon.' });
    return route.fulfill({ json: { translation: 'Галт тэрэг удахгүй хөдөлнө.' } });
  });
  await openLocal(
    page,
    'WEBVTT\n\n00:01.000 --> 00:04.000\nThe train leaves soon.\n\n00:06.000 --> 00:08.000\nWait here.\n',
    'WEBVTT\n\n00:01.000 --> 00:04.000\nЧи надад итгэнэ гэдгийг би мэдэж байна.\n',
  );
  const practice = page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' });
  expect(calls).toBe(0);
  await practice.getByRole('button', { name: 'Утга таарахгүй байна', exact: true }).click();
  await expect(practice).not.toContainText('Чи надад итгэнэ');
  expect(calls).toBe(0);
  await expect(practice).toContainText('Энэ өгүүлбэр MyMemory үйлчилгээнд илгээгдэнэ');
  await practice.getByRole('button', { name: 'Монгол утгыг үзэх', exact: true }).click();
  await expect(practice).toContainText('Галт тэрэг удахгүй хөдөлнө.');
  await practice.getByRole('button', { name: 'train — утгыг харах', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Үгийн тайлбар' })).toContainText(
    'Галт тэрэг удахгүй хөдөлнө.',
  );
  await page.keyboard.press('Escape');
  await practice.getByRole('button', { name: 'Дараагийн өгүүлбэр', exact: true }).click();
  await practice.getByRole('button', { name: 'Өмнөх өгүүлбэр', exact: true }).click();
  await expect(practice).toContainText('Галт тэрэг удахгүй хөдөлнө.');
  await practice.getByRole('button', { name: 'Бүх хадмал', exact: true }).click();
  const transcript = page.getByRole('list', { name: 'Хадмалын жагсаалт' });
  await expect(transcript).toContainText('Галт тэрэг удахгүй хөдөлнө.');
  await expect(transcript).not.toContainText('Чи надад итгэнэ');
  await page.getByRole('button', { name: '← Нэг өгүүлбэрээр харах', exact: true }).click();
  await expect(practice).toContainText('Галт тэрэг удахгүй хөдөлнө.');
  await expect(practice).toContainText('Автомат утга · MyMemory');
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('vxnta.learning.sentence-corrections.v1')!),
    ),
  ).toEqual([
    expect.objectContaining({
      text: 'The train leaves soon.',
      translation: 'Галт тэрэг удахгүй хөдөлнө.',
    }),
  ]);
  expect(calls).toBe(1);
});

test('the reported phrase shows its authored meaning instead of an unrelated matching-timestamp subtitle', async ({
  page,
}) => {
  let calls = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/learning/sentence')) calls++;
  });
  await openLocal(
    page,
    "WEBVTT\n\n00:01.000 --> 00:04.000\nthat's gonna sound crazy.\n",
    'WEBVTT\n\n00:01.000 --> 00:04.000\nЧи надад итгэнэ гэдгийг би мэдэж байна.\n',
  );
  const practice = page.getByRole('region', { name: 'Өгүүлбэрээр үг сурах' });
  await expect(practice).toContainText('Сонсвол итгэмээргүй санагдах байх.');
  await expect(practice).not.toContainText('Чи надад итгэнэ');
  await practice.getByRole('button', { name: 'gonna — утгыг харах', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Үгийн тайлбар' });
  await expect(dialog).toContainText('... хийх гэж байна; ... болох байх');
  await expect(dialog).toContainText('going to-ийн ярианы товчлол');
  await expect(dialog).toContainText('Сонсвол итгэмээргүй санагдах байх.');
  await page.keyboard.press('Escape');
  await practice
    .getByRole('button', { name: 'sound crazy — утгыг харах', exact: true })
    .first()
    .click();
  await expect(dialog).toContainText('итгэмээргүй сонсогдох');
  expect(calls).toBe(0);
});
