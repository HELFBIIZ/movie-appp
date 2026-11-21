import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig(config, {
  testMatch: 'regression.spec.ts',
  snapshotPathTemplate:
    (process.env.VXNTA_BASELINE_DIR || './.refactor-evidence/baseline') + '/{arg}{ext}',
  expect: {
    timeout: 30000,
    toHaveScreenshot: {
      timeout: 60000,
      maxDiffPixels: 0,
      animations: 'allow',
      style: '* { animation: none !important; transition: none !important; }',
    },
  },
  use: {
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    timezoneId: 'Asia/Ulaanbaatar',
    colorScheme: 'light',
  },
});
