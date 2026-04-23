import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const pwaRoot = path.dirname(fileURLToPath(import.meta.url));

/** Dedicated ports so E2E does not fight `npm run dev` on 5173 / 8787. */
const e2eVitePort = '5183';
const e2eSimPort = process.env.E2E_SIM_PORT ?? '18983';
const e2eOrigin = `http://127.0.0.1:${e2eVitePort}`;

/**
 * E2E: starts Vite + API simulator (same as local `npm run dev`).
 * One-time: `npx playwright install chromium` (or use system Chrome via PW_CHANNEL=chrome).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: e2eOrigin,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    ...(process.env.PW_CHANNEL === 'chrome' ? { channel: 'chrome' as const } : {}),
  },
  projects: [{ name: 'chromium', use: {} }],
  webServer: {
    command: 'npm run dev:e2e',
    cwd: pwaRoot,
    url: e2eOrigin,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: e2eSimPort,
      E2E_SIM_PORT: e2eSimPort,
    },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 180_000,
  },
});
