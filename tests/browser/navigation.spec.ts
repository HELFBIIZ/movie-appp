import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dismissPlacement } from './learning-fixtures';

test.beforeEach(async ({ page }) => {
  await dismissPlacement(page);
});

test('desktop navigation is compact; category links close on selection, outside click and Escape', async ({
  page,
}) => {
  await page.goto('/movies');
  const nav = page.getByRole('navigation', { name: 'Үндсэн цэс' });
  await expect(nav.getByRole('link')).toHaveCount(3);
  await expect(nav.getByRole('link', { name: 'Кино', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const trigger = nav.getByRole('button', { name: 'Ангилал', exact: true });
  await trigger.click();
  await expect(nav.getByRole('link', { name: 'Өндөр үнэлгээтэй', exact: true })).toHaveAttribute(
    'href',
    '/movies?category=top-rated',
  );
  await expect(nav.getByRole('link', { name: 'Хүүхэлдэйн', exact: true })).toHaveAttribute(
    'href',
    '/genre/animation',
  );
  mkdirSync('.refactor-evidence/preview', { recursive: true });
  await page.screenshot({ path: '.refactor-evidence/preview/navigation-desktop.png' });
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { level: 1 }).first().click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await nav.getByRole('link', { name: 'Өндөр үнэлгээтэй', exact: true }).click();
  await expect(page).toHaveURL(/\/movies\?category=top-rated$/);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('mobile menu keeps categories collapsed, reaches every collection and fits a 320px screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/movies');
  const toggle = page.getByRole('button', { name: 'Toggle menu', exact: true });
  await toggle.click();
  const nav = page.getByRole('navigation', { name: 'Утасны цэс' });
  await expect(nav.getByRole('link', { name: 'Кино', exact: true })).toBeFocused();
  await expect(nav.getByRole('link', { name: 'Солонгос цуврал', exact: true })).toBeHidden();
  mkdirSync('.refactor-evidence/preview', { recursive: true });
  await page.screenshot({ path: '.refactor-evidence/preview/navigation-mobile.png' });
  await nav.getByText('Киноны ангилал', { exact: true }).click();
  await expect(nav.getByRole('link', { name: 'Солонгос цуврал', exact: true })).toHaveAttribute(
    'href',
    '/movies?category=kdrama',
  );
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await nav.getByRole('link', { name: 'Жагсаалт', exact: true }).click();
  await expect(page).toHaveURL(/\/watchlist$/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
