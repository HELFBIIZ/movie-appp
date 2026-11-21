import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig(config, {
  testMatch: 'regression.spec.ts',
  testIgnore: [],
  snapshotPathTemplate:
    (process.env.VXNTA_BASELINE_DIR || './.refactor-evidence/baseline') + '/{arg}{ext}',
  expect: {
    timeout: 60000,
    toHaveScreenshot: {
      maxDiffPixels: 0,
      animations: 'allow',
      stylePath: 'tests/fixtures/visual.css',
    },
  },
  use: {
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    timezoneId: 'Asia/Ulaanbaatar',
    colorScheme: 'light',
  },
});
