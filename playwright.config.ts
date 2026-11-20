import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: process.env.SCENECHAIN_BASE_URL || 'http://127.0.0.1:3100',
    headless: true,
    actionTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.SCENECHAIN_CHROMIUM_PATH || undefined },
  },
  webServer: process.env.SCENECHAIN_BASE_URL
    ? undefined
    : {
        command: 'npm run start -- --port 3100',
        url: 'http://127.0.0.1:3100',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
