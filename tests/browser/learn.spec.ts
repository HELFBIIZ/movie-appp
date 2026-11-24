import { expect, test } from '@playwright/test';
import { dismissPlacement, openLocal, seedWords } from './learning-fixtures';

test('free exercise is removed, old bookmarks reach the catalog and sample media is not served', async ({
  page,
  request,
}) => {
  await dismissPlacement(page);
  await page.goto('/learn');
  await expect(page).toHaveURL(/\/movies$/);
  await expect(page.locator('a[href="/learn"]')).toHaveCount(0);
  expect((await request.get('/learning/last-train.webm')).status()).toBe(404);
  await page.goto('/movie/spider-man-brand-new-day');
  await expect(page.getByRole('link', { name: 'Үзэнгээ үг сурах' })).toHaveAttribute(
    'href',
    '/watch/spider-man-brand-new-day?learn=1',
  );
  await page.getByRole('link', { name: 'Үзэнгээ үг сурах' }).click();
  await expect(page.getByRole('region', { name: 'SceneChain Learning Dock' })).toBeVisible();
  await expect(page.getByText('Үнэгүй дасгалаар эхлэх', { exact: true })).toHaveCount(0);
});

test('word coach teaches a ready Mongolian meaning and records one answer, with no required note fields', async ({
  page,
}) => {
  const video = await openLocal(page);
  await page
    .getByRole('region', { name: 'Өгүүлбэрээр үг сурах' })
    .getByRole('button', { name: 'last — утгыг харах', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Үгийн тайлбар' });
  await expect(dialog).toContainText('сүүлчийн');
  await expect(dialog.getByRole('textbox')).toBeHidden();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await dialog.getByRole('button', { name: 'Энэ үгийг суръя', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'сүүлчийн', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'сүүлчийн', exact: true }).click();
  await expect(dialog).toContainText('Зөв саналаа!');
  await dialog.getByRole('button', { name: 'Киногоо үргэлжлүүлэх', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused))
    .toBe(true);
  await page.reload();
  await page.goto('/learning');
  await expect(page.getByRole('list', { name: 'Хадгалсан үгс' })).toContainText('last');
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('vxnta.learning.guest.v2')!).snapshot,
  );
  expect(saved.progress.items[0]).toMatchObject({
    word: 'last',
    meaning: 'сүүлчийн',
    correct: 1,
    incorrect: 0,
    provenance: 'curated',
  });
  expect(saved.activity.filter((event: { kind: string }) => event.kind === 'review')).toHaveLength(
    1,
  );
});

test('typed review keeps a stable two-word queue and saves wrong answers only once', async ({
  page,
}) => {
  await dismissPlacement(page);
  await seedWords(page);
  await page.goto('/learning');
  await page.getByRole('button', { name: /үгээ давтах/ }).click();
  const form = page.getByRole('form', { name: 'Санаж бичих дасгал' });
  await expect(form).toContainText('The _____ train leaves in ten minutes.');
  await form.getByLabel('Англи үгээ бичээрэй').fill('last');
  await form.getByRole('button', { name: 'Шалгах', exact: true }).click();
  await form.getByRole('button', { name: 'Дараагийн үг', exact: true }).click();
  await expect(form).toContainText('The last _____ leaves in ten minutes.');
  await form.getByLabel('Англи үгээ бичээрэй').fill('training');
  await form.getByRole('button', { name: 'Шалгах', exact: true }).click();
  await expect(form.getByRole('status')).toContainText('Дахиад давтъя. train');
  await expect(form.getByRole('button', { name: 'Шалгах', exact: true })).toHaveCount(0);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('vxnta.learning.guest.v2')!).snapshot,
  );
  expect(saved.progress.items.find((item: { word: string }) => item.word === 'last').correct).toBe(
    1,
  );
  expect(
    saved.progress.items.find((item: { word: string }) => item.word === 'train').incorrect,
  ).toBe(1);
  expect(saved.activity.filter((event: { kind: string }) => event.kind === 'review')).toHaveLength(
    2,
  );
});
