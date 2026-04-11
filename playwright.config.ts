import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 2,
  fullyParallel: true,
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  expect: {
    timeout: 35_000,
  },
  use: {
    baseURL: 'http://localhost:3999',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
});
