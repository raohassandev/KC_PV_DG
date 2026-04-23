/**
 * Fresh CONFIG_DIR under PWA/.e2e-gateway-config and start the gateway (Playwright webServer).
 * Exits with the gateway child exit code when it terminates.
 */
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pwaRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const configDir = path.join(pwaRoot, '.e2e-gateway-config');
const port = process.env.E2E_GATEWAY_PORT ?? '8789';
const gatewayEntry = path.join(pwaRoot, '..', 'gateway', 'src', 'index.ts');

await rm(configDir, { recursive: true, force: true });
await mkdir(configDir, { recursive: true });

const child = spawn('npx', ['tsx', gatewayEntry], {
  stdio: 'inherit',
  cwd: pwaRoot,
  env: {
    ...process.env,
    CONFIG_DIR: configDir,
    PORT: port,
    MQTT_URL: '',
  },
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
