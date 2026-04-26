import { defineConfig, devices } from '@playwright/test';

/**
 * Use this config to validate the already-running local dev server at 5173.
 * It intentionally does NOT start/stop any webServer.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    // On this machine, Vite is reachable via `localhost` (IPv6 ::1), but not `127.0.0.1`.
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium' }],
});

