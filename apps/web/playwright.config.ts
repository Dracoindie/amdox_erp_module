import { defineConfig } from '@playwright/test';

// Smoke tests against a running stack (API + web). Start them first, e.g.
//   pnpm infra:up && pnpm --filter api db:seed && pnpm dev
// then: WEB_URL=http://localhost:3000 pnpm --filter web test:e2e
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  timeout: 120_000,
  workers: 1, // shared seeded database and auth rate limits
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3000',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    // PW_CHANNEL=msedge (or chrome) runs an installed browser instead of the
    // bundled Chromium, e.g. where Windows Application Control blocks
    // chrome-headless-shell.exe (see README). Unset: bundled Chromium, as in CI.
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
});
