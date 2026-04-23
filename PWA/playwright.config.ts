import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const pwaRoot = path.dirname(fileURLToPath(import.meta.url));

/** Dedicated ports so E2E does not fight `npm run dev` on 5173 / 8787. */
const e2eVitePort = '5183';
const e2eSimPort = process.env.E2E_SIM_PORT ?? '18983';
const e2eOrigin = `http://127.0.0.1:${e2eVitePort}`;

const useGatewayStack = process.env.E2E_WITH_GATEWAY === '1';
const gatewayPort = process.env.E2E_GATEWAY_PORT ?? '8789';
const gatewayHealthUrl = `http://127.0.0.1:${gatewayPort}/api/health`;
const gatewayOrigin = `http://127.0.0.1:${gatewayPort}`;

const simAndPortEnv = {
  ...process.env,
  PORT: e2eSimPort,
  E2E_SIM_PORT: e2eSimPort,
};

const defaultWebServer = {
  command: 'npm run dev:e2e',
  cwd: pwaRoot,
  url: e2eOrigin,
  reuseExistingServer: !process.env.CI,
  env: simAndPortEnv,
  stdout: 'pipe' as const,
  stderr: 'pipe' as const,
  timeout: 180_000,
};

const gatewayWebServer = {
  command: `node "${path.join(pwaRoot, 'scripts/e2e-gateway-server.mjs')}"`,
  cwd: pwaRoot,
  url: gatewayHealthUrl,
  reuseExistingServer: !process.env.CI,
  env: { ...process.env, E2E_GATEWAY_PORT: gatewayPort },
  stdout: 'pipe' as const,
  stderr: 'pipe' as const,
  timeout: 120_000,
};

const viteWithGatewayWebServer = {
  command: 'npm run dev:e2e',
  cwd: pwaRoot,
  url: e2eOrigin,
  reuseExistingServer: !process.env.CI,
  env: { ...simAndPortEnv, VITE_GATEWAY_URL: gatewayOrigin },
  stdout: 'pipe' as const,
  stderr: 'pipe' as const,
  timeout: 180_000,
};

/**
 * Default: Vite + API simulator (local auth).
 * `E2E_WITH_GATEWAY=1`: parallel gateway (fresh auth) + Vite with `VITE_GATEWAY_URL` for fleet sync E2E.
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
  projects: useGatewayStack
    ? [{ name: 'gateway-sync', testMatch: '**/06-gateway-site-sync.spec.ts' }]
    : [{ name: 'chromium', testIgnore: '**/06-gateway-site-sync.spec.ts' }],
  webServer: useGatewayStack
    ? [gatewayWebServer, viteWithGatewayWebServer]
    : defaultWebServer,
});
