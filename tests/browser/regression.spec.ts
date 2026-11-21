import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// UI contract fixtures. All account/payment writes are intercepted, never charged.
const me = {
  id: 'ui-fixture',
  email: 'learner@example.test',
  username: 'learner',
  roleCode: 'USER',
  xp: 120,
  level: 2,
  gamification: { xp: 120, level: 2 },
  subscription: null,
  profile: { displayName: 'Learner', bio: 'Learning with films', avatarUrl: null },
};
const plans = [
  {
    id: 'pl_monthly',
    code: 'MONTHLY',
    name: 'Monthly Unlimited',
    priceMnt: 5900,
    durationDays: 30,
  },
];
const blankArt =
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="800" height="1200" fill="#334155"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-21T03:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-21T04:00:00Z'));
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } }),
  );
  await page.route('**/api/notifications', (route) =>
    route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } }),
  );
  await page.route('**/api/plans', (route) => route.fulfill({ json: { plans } }));
  await page.route('**/api/rewards', (route) =>
    route.fulfill({ json: { rewards: [], myRewards: [] } }),
  );
  await page.route('**/api/watch/**', (route) =>
    route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } }),
  );
  await page.route('**/api/subtitles?**', (route) => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/reviews/**', (route) =>
    route.fulfill({ json: { reviews: [], average: 0 } }),
  );
  await page.route('**/api/favorites**', (route) =>
    route.fulfill({ status: 401, json: { error: { code: 'UNAUTHENTICATED' } } }),
  );
  // Deterministic artwork prevents external image/CDN changes from hiding a UI regression.
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.resourceType() === 'image') {
      await route.fulfill({ contentType: 'image/svg+xml', body: blankArt });
    } else if (
      new URL(request.url()).origin !==
      new URL(test.info().project.use.baseURL || 'http://127.0.0.1:3100').origin
    ) {
      await route.abort();
    } else {
      await route.fallback();
    }
  });
});

async function ready(page: Page) {
  await expect(page.locator('main')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // The header's authentication effect has settled when Sign In is visible.
  await expect(
    page.locator('header').getByRole('link', { name: 'Sign In', exact: true }),
  ).toBeVisible();
}

async function appearance(page: Page, name: string) {
  const mask = [page.locator('video, iframe')];
  await expect(page).toHaveScreenshot(name, { mask });
  if (process.env.VXNTA_AFTER_DIR) {
    fs.mkdirSync(process.env.VXNTA_AFTER_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(process.env.VXNTA_AFTER_DIR, name),
      mask,
      animations: 'allow',
      style: fs.readFileSync('tests/fixtures/visual.css', 'utf8'),
    });
  }
}

for (const [name, route] of [
  ['home', '/'],
  ['catalog', '/movies'],
  ['movie', '/movie/spider-man-brand-new-day'],
  ['watch', '/watch/spider-man-brand-new-day'],
  ['login', '/login'],
  ['pricing', '/pricing'],
  ['learning', '/learn'],
]) {
  test(`preserved ${name} desktop and mobile appearance`, async ({ page }) => {
    await page.goto(route);
    await ready(page);
    if (name === 'watch')
      await expect(page.getByRole('heading', { level: 2 })).toContainText('нэвтэрнэ');
    if (name === 'pricing')
      await expect(page.getByText('Monthly Unlimited', { exact: true }).first()).toBeVisible();
    await appearance(page, `${name}-desktop.png`);
    await page.setViewportSize({ width: 390, height: 844 });
    await appearance(page, `${name}-mobile.png`);
  });
}

test('search and mobile navigation preserve their existing results and URLs', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Search movies', { exact: true }).fill('Inception');
  const result = page.locator('a[href="/movie/inception"]').last();
  await result.scrollIntoViewIfNeeded();
  await expect(result).toBeVisible();
  await expect(result).toContainText('Inception');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Toggle menu', exact: true }).click();
  await appearance(page, 'mobile-navigation.png');
  await page.getByRole('link', { name: 'All Movies', exact: true }).click();
  await expect(page).toHaveURL(/\/movies$/);
});

test('profile editing uses the same payload without writing a real user', async ({ page }) => {
  let submitted: unknown;
  await page.route('**/api/profile', async (route) => {
    if (route.request().method() === 'PATCH') {
      submitted = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true, profile: me.profile } });
    } else await route.fulfill({ json: { me } });
  });
  await page.goto('/profile');
  await ready(page);
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  await appearance(page, 'profile-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await appearance(page, 'profile-mobile.png');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByPlaceholder('How others see you').fill('New learner');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('Profile saved!', { exact: true })).toBeVisible();
  expect(submitted).toEqual({ displayName: 'New learner', bio: me.profile.bio, avatarUrl: '' });
});

test('password login handles failure and success with mocked sessions', async ({ page }) => {
  let succeed = false;
  await page.route('**/api/auth/login', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      identifier: 'learner@example.test',
      password: 'fixture-only-password',
    });
    await route.fulfill(
      succeed
        ? { json: { ok: true } }
        : { status: 401, json: { error: { code: 'INVALID_CREDENTIALS' } } },
    );
  });
  await page.goto('/login');
  await page.getByLabel('Email or username').fill('learner@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fixture-only-password');
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('INVALID_CREDENTIALS', { exact: true })).toBeVisible();
  succeed = true;
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/');
});

test('theme colors and mobile menu remain the same in dark mode', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Toggle theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await appearance(page, 'home-dark-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await appearance(page, 'home-dark-mobile.png');
  await page.getByRole('button', { name: 'Toggle menu', exact: true }).click();
  await appearance(page, 'mobile-navigation-dark.png');
});

test('admin navigation and logout use mocked identity without changing server roles', async ({
  page,
}) => {
  let loggedIn = true;
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { me: loggedIn ? { ...me, roleCode: 'ADMIN' } : null } }),
  );
  await page.route('**/api/auth/logout', async (route) => {
    expect(route.request().method()).toBe('POST');
    loggedIn = false;
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto('/');
  await expect(
    page.locator('header').getByRole('link', { name: 'Admin', exact: true }),
  ).toBeVisible();
  await page
    .locator('header button')
    .filter({ has: page.locator('svg.lucide-user') })
    .click();
  await page.getByRole('menuitem').filter({ hasText: 'Logout' }).click();
  await expect(
    page.locator('header').getByRole('link', { name: 'Sign In', exact: true }),
  ).toBeVisible();
  expect(loggedIn).toBe(false);
});

test('all five existing player URLs remain selectable without loading third-party film', async ({
  page,
}) => {
  await page.route('**/api/watch/spider-man-brand-new-day', (route) =>
    route.fulfill({ json: { allowed: true } }),
  );
  await page.goto('/watch/spider-man-brand-new-day');
  const select = page.getByRole('combobox', { name: 'Тоглуулагч', exact: true });
  await expect(select.getByRole('option')).toHaveCount(5);
  for (const [source, origin] of [
    ['vidsrc', 'vidsrcme.ru'],
    ['cine', 'cinesrc.st'],
    ['superembed', 'multiembed.mov'],
    ['embedmaster', 'embedmaster.link'],
    ['embedapi', 'watch.embed-api.stream'],
  ]) {
    await select.selectOption(source);
    await expect(page.getByTitle('Spider-Man: Brand New Day player')).toHaveAttribute(
      'src',
      new RegExp(origin.replaceAll('.', '\\.')),
    );
  }
});

test('checkout keeps its provider payload and errors without creating a payment', async ({
  page,
}) => {
  const submitted: unknown[] = [];
  await page.route('**/api/checkout', async (route) => {
    submitted.push(route.request().postDataJSON());
    await route.fulfill({ status: 503, json: { error: { code: 'FIXTURE_PROVIDER_UNAVAILABLE' } } });
  });
  await page.goto('/pricing');
  await page.getByRole('button', { name: 'Buy with card (demo)', exact: true }).click();
  await expect(page.getByText('FIXTURE_PROVIDER_UNAVAILABLE', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Wire-ээр төлөх/ }).click();
  await page.getByRole('button', { name: /QPay-ээр төлөх/ }).click();
  expect(submitted).toEqual(
    ['local_dev', 'wire', 'qpay'].map((provider) => ({ planCode: 'MONTHLY', provider })),
  );
});

test('real guest API contracts keep account, VIP, admin and payment gates', async ({ request }) => {
  for (const route of ['/api/auth/me', '/api/profile', '/api/admin/overview']) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(401);
    expect((await response.json()).error.code).toBe('UNAUTHENTICATED');
  }
  for (const route of ['/api/checkout', '/api/watch/spider-man-brand-new-day']) {
    const response = await request.post(route, { data: {} });
    expect(response.status(), route).toBe(401);
  }
  expect((await request.get('/api/checkout')).status()).toBe(405);
  const favorites = await request.get('/api/favorites');
  expect(favorites.status()).toBe(200);
  expect(await favorites.json()).toEqual({ favorites: [] });
  const options = await request.get('/api/payment-options');
  expect(await options.json()).toEqual({ bank: true, qpay: false, demo: false });
  const catalog = await request.get('/api/plans');
  expect(catalog.status()).toBe(200);
  expect((await catalog.json()).plans.length).toBeGreaterThan(0);
});
