import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
};
const dependencyRoot = option('--dependencies-root', null);
const require = createRequire(
  dependencyRoot ? path.join(path.resolve(dependencyRoot), 'package.json') : import.meta.url,
);
const { chromium } = require('@playwright/test');
const base = new URL(option('--base-url', 'https://vxnta-movie-app.onrender.com'));
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
  throw new Error('Use an HTTP origin without credentials.');
}
const out = path.resolve(option('--out', '.refactor-evidence/live'));
fs.mkdirSync(out, { recursive: true });
const report = {
  base: base.origin,
  capturedAtUtc: new Date().toISOString(),
  mode: 'anonymous read-only baseline; no payment or account mutations',
  pages: [],
  endpoints: [],
  moviePlaybackVerified: false,
};
const browser = await chromium.launch({
  executablePath: process.env.SCENECHAIN_CHROMIUM_PATH || undefined,
  headless: true,
});
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    timezoneId: 'Asia/Ulaanbaatar',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const routes = [
    ['home', '/'],
    ['catalog', '/movies'],
    ['movie', '/movie/spider-man-brand-new-day'],
    ['watch', '/watch/spider-man-brand-new-day'],
    ['login', '/login'],
    ['pricing', '/pricing'],
    ['profile', '/profile'],
    ['learning', '/learn'],
  ];
  for (const [name, route] of routes) {
    process.stdout.write(JSON.stringify({ opening: name, route }) + '\n');
    const response = await page.goto(new URL(route, base).href, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.locator('main').waitFor();
    await page.screenshot({
      path: path.join(out, `${name}-desktop.png`),
      animations: 'allow',
      style: '* { animation: none !important; transition: none !important; }',
      mask: [page.locator('video, iframe')],
      fullPage: false,
    });
    report.pages.push({
      name,
      route,
      status: response?.status(),
      title: await page.title(),
      headings: await page.getByRole('heading', { level: 1 }).allTextContents(),
      movieIframes: name === 'watch' ? await page.locator('iframe').count() : undefined,
    });
    process.stdout.write(
      JSON.stringify({ captured: name, route, status: response?.status() }) + '\n',
    );
  }
  await page.goto(new URL('/watch/spider-man-brand-new-day', base).href, {
    waitUntil: 'domcontentloaded',
  });
  await page
    .getByRole('button', { name: '\u04ae\u0433 \u0441\u0443\u0440\u0430\u0445', exact: true })
    .click();
  const dock = page.getByRole('region', { name: 'SceneChain Learning Dock' });
  await dock.waitFor();
  report.learningTabs = await dock
    .getByRole('group', { name: 'Learning panels' })
    .getByRole('button')
    .allTextContents();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(out, 'watch-learning-mobile.png'),
    animations: 'allow',
    style: '* { animation: none !important; transition: none !important; }',
    fullPage: true,
  });
  report.mobile = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  for (const route of [
    '/api/auth/me',
    '/api/profile',
    '/api/admin/overview',
    '/api/favorites',
    '/api/payment-options',
    '/api/plans',
    '/api/checkout',
    '/api/subtitles/mongolian/spider-man-brand-new-day?meta=1',
  ]) {
    const response = await page.request.get(new URL(route, base).href);
    let body;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    report.endpoints.push({ route, status: response.status(), body });
  }
  const gate = await page.request.post(new URL('/api/watch/spider-man-brand-new-day', base).href);
  report.endpoints.push({
    route: '/api/watch/spider-man-brand-new-day',
    method: 'POST (anonymous gate only)',
    status: gate.status(),
    body: await gate.json(),
  });
  const scripts = await page
    .locator('script[src]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('src')).filter(Boolean),
    );
  report.watchAssets = [];
  for (const script of scripts.filter((url) => url.includes('/app/watch/'))) {
    const response = await page.request.get(new URL(script, base).href);
    const bytes = await response.body();
    report.watchAssets.push({
      path: script,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    });
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out, 'baseline.json'), JSON.stringify(report, null, 2) + '\n');
}
process.stdout.write(
  JSON.stringify({
    out,
    pages: report.pages.length,
    endpoints: report.endpoints.length,
    moviePlaybackVerified: false,
  }) + '\n',
);
