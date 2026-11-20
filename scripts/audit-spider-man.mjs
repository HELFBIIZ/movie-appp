// Read-only live audit. Never grants VIP, mocks access, plays a substitute clip,
// requests stream extraction, or treats a successful audit as film verification.
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SCENECHAIN_BASE_URL || 'https://movie-appp-ivory.vercel.app';
const browser = await chromium.launch({
  executablePath: process.env.SCENECHAIN_CHROMIUM_PATH || undefined,
  headless: true,
});
const report = {
  base,
  observedAt: new Date().toISOString(),
  mocks: false,
  moviePlaybackVerified: false,
  filmIdentityVerified: false,
  subtitlesVerifiedAgainstFilm: false,
};
fs.mkdirSync('test-results', { recursive: true });
try {
  const page = await browser.newPage();
  await page.goto(`${base}/watch/spider-man-brand-new-day`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.getByRole('heading', { name: 'This title needs VIP', exact: true }).waitFor();
  report.title = await page.getByRole('heading', { level: 1 }).innerText();
  const gate = await page.request.post(`${base}/api/watch/spider-man-brand-new-day`);
  report.gate = { status: gate.status(), error: (await gate.json()).error?.code };
  report.movieIframes = await page.locator('iframe').count();
  await page.getByRole('button', { name: 'Learning Mode', exact: true }).click();
  await page.getByRole('button', { name: 'Movie player', exact: true }).waitFor();
  report.sampleOffered =
    (await page.getByRole('button', { name: 'Sample lesson', exact: true }).count()) > 0;
  await page.getByRole('button', { name: 'Movie player', exact: true }).click();
  report.unsupported =
    (await page.getByText('Sync unavailable for this player', { exact: true }).count()) > 0;
  report.guestNotice =
    (await page
      .getByText(
        'Кино болон киноны transcript нээхийн өмнө VXNTA-д нэвтэрч, VIP эрхээ баталгаажуулна уу.',
        { exact: true },
      )
      .count()) > 0;
  report.filmVideoElements = await page.locator('video').count();
  const metadata = await page.request.get(
    `${base}/api/subtitles/mongolian/spider-man-brand-new-day?meta=1`,
  );
  report.subtitleMetadata = {
    status: metadata.status(),
    ...(metadata.ok() ? await metadata.json() : {}),
  };
  await page.setViewportSize({ width: 390, height: 844 });
  report.mobile = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  await page.screenshot({ path: 'test-results/spider-man-live-audit.png', fullPage: true });
  await page.getByRole('button', { name: 'Local video + VTT', exact: true }).click();
  report.localInputs = {
    video: await page.getByLabel('Local video', { exact: true }).count(),
    en: await page.getByLabel('English VTT', { exact: true }).count(),
    mn: await page.getByLabel('Mongolian VTT', { exact: true }).count(),
  };
  report.samplePlayed = false;
  fs.writeFileSync(
    'test-results/spider-man-live-audit.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
