import type { Page } from '@playwright/test';

export async function skipPlacement(page: Page) {
  // Existing feature tests are independent of first-visit assessment onboarding.
  await page.addInitScript(() =>
    sessionStorage.setItem('vxnta.scenechain.placement.dismissed.v1', '1'),
  );
}
