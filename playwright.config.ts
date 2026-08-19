import { defineConfig } from '@playwright/test';

/**
 * Playwright config scoped to the responsive-layout guard.
 *
 * The other specs in tests/ are authenticated end-to-end flows that need a
 * seeded account, so they are not part of this project's default run.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /responsive-layout\.spec\.ts/,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
