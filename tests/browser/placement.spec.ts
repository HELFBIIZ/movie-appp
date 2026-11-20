import { expect, test, type Page } from '@playwright/test';
import { placementQuestions, PLACEMENT_KEY } from '../../src/lib/learning/placement';

async function complete(
  page: Page,
  pick: (question: (typeof placementQuestions)[number]) => string | null,
) {
  const dialog = page.getByRole('dialog', { name: 'Эхлэх түвшний тест' });
  await dialog.getByRole('button', { name: 'Тестээ эхлэх', exact: true }).click();
  for (let index = 0; index < placementQuestions.length; index++) {
    const question = placementQuestions[index];
    await expect(dialog.getByText(`Асуулт ${index + 1} / 8`, { exact: true })).toBeVisible();
    const next = dialog.getByRole('button', {
      name: index === 7 ? 'Үр дүнгээ харах' : 'Дараагийн асуулт',
      exact: true,
    });
    await expect(next).toBeDisabled();
    await dialog
      .getByRole('button', { name: pick(question) ?? 'Мэдэхгүй · Алгасах', exact: true })
      .click();
    await next.click();
  }
  return dialog;
}

test('first movie visit offers a level check and a real saved recommendation opens Brand New Day learning', async ({
  page,
  request,
}) => {
  await page.goto('/movie/spider-man-brand-new-day', { waitUntil: 'domcontentloaded' });
  const result = await complete(page, (q) => q.answer);
  await expect(result.getByRole('heading', { name: 'Дунд', exact: true })).toBeVisible();
  await expect(result).toContainText('Зөв хариулт: 8 / 8');
  await expect(result).toContainText('Сонсох, ярих, бичих чадварыг шалгаагүй');
  await result.getByRole('button', { name: 'Энэ киногоор сурах', exact: true }).click();
  await expect(page).toHaveURL(/\/watch\/spider-man-brand-new-day\?learn=1$/);
  await expect(page.getByRole('button', { name: 'Үг сурах', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('Миний эхлэх түвшин')).toContainText('Дунд · Хичээлд 8 үг');
  await expect(
    page.getByRole('button', { name: 'Монгол тайлбар: нуусан', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  expect((await request.post('/api/watch/spider-man-brand-new-day')).status()).toBe(401);
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Миний эхлэх түвшин')).toContainText('Дунд');
  await expect(page.getByRole('dialog', { name: 'Эхлэх түвшний тест' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Түвшнээ дахин шалгах', exact: true }).click();
  await page.getByRole('button', { name: 'Тестээ эхлэх', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Дараагийн асуулт', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Миний эхлэх түвшин')).toContainText('Дунд');
});

test('login is uninterrupted; first site entry can skip and later answer unknown without a fake score', async ({
  page,
}) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Эхлэх түвшний тест' })).not.toBeVisible();
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Эхлэх түвшний тест' });
  await dialog.getByRole('button', { name: 'Дараа үзье', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), PLACEMENT_KEY)).toBeNull();
  await page.goto('/learn');
  await expect(page.getByRole('heading', { name: 'Нэг өгүүлбэрээс эхэлье.' })).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: '2 минутын тест', exact: true }).click();
  await complete(page, () => null);
  await expect(dialog.getByRole('heading', { name: 'Анхан', exact: true })).toBeVisible();
  await expect(dialog).toContainText('Зөв хариулт: 0 / 8');
  await dialog.getByRole('button', { name: 'Миний хичээлийг эхлэх', exact: true }).click();
  await expect(page.getByLabel('Миний эхлэх түвшин')).toContainText('Анхан · Хичээлд 3 үг');
  await expect(
    page.getByRole('button', { name: 'Монгол тайлбар: харагдана', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('corrupt placement is reported without deleting placement or vocabulary data', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('vxnta.scenechain.placement.v1', '{broken');
    localStorage.setItem(
      'vxnta.scenechain.v1',
      '{"items":[],"contextCorrect":3,"contextIncorrect":1}',
    );
  });
  await page.goto('/learn');
  const dialog = page.getByRole('dialog', { name: 'Эхлэх түвшний тест' });
  await expect(dialog.getByRole('alert')).toContainText('уншиж чадсангүй');
  await dialog.getByRole('button', { name: 'Дараа үзье', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('vxnta.scenechain.placement.v1'))).toBe(
    '{broken',
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('vxnta.scenechain.v1')!).contextCorrect,
    ),
  ).toBe(3);
});

test('a failed profile write keeps a visible warning and never claims persistence', async ({
  page,
}) => {
  await page.goto('/learn');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota', 'QuotaExceededError');
    };
  });
  const result = await complete(page, (q) => q.answer);
  await expect(result.getByRole('alert')).toContainText('хадгалагдсангүй');
  expect(await page.evaluate((key) => localStorage.getItem(key), PLACEMENT_KEY)).toBeNull();
  await result.getByRole('button', { name: 'Миний хичээлийг эхлэх', exact: true }).click();
  await expect(page.getByLabel('Миний эхлэх түвшин').getByRole('alert')).toContainText(
    'хадгалагдсангүй',
  );
});

test('the recommended lesson actually hides translation and its toggle restores it', async ({
  page,
}) => {
  await page.addInitScript(
    (answers) =>
      localStorage.setItem(
        'vxnta.scenechain.placement.v1',
        JSON.stringify({ version: 1, completedAt: 1000, answers }),
      ),
    Object.fromEntries(placementQuestions.map((q) => [q.id, q.answer])),
  );
  await page.goto('/learn');
  const first = page.getByRole('list', { name: 'Bilingual transcript' }).locator('li').first();
  await expect(first).toBeVisible();
  await expect(first.locator('[lang="mn"]')).toHaveCount(0);
  await expect(page.getByLabel('Learning steps')).toContainText('0/8 үг');
  await page.getByRole('button', { name: 'Монгол тайлбар: нуусан', exact: true }).click();
  await expect(first.locator('[lang="mn"]')).toContainText('Сүүлчийн галт тэрэг');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Түвшнээ дахин шалгах', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Эхлэх түвшний тест' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/placement-mobile.png', fullPage: true });
});
