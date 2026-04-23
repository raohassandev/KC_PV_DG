import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDzxApiClient } from '../services/apiClient';
import { createDzxProvider } from '../services/provider';
import { createApiServer } from '../../../../../dynamic_zero_export/api_simulator';

test('api client returns the expected snapshot payloads', async () => {
  const stateDir = mkdtempSync(path.join(tmpdir(), 'dzx-api-'));
  const sim = createApiServer(8788, stateDir);
  const server = await sim.listen();
  try {
    const client = createDzxApiClient('http://127.0.0.1:8788');
    const live = await client.getLiveStatus();
    const device = await client.getDeviceInfo();
    const alerts = await client.getAlerts();
    assert.equal(device.deviceId, 'dzx-001');
    assert.equal(live.siteName, 'Demo Plant');
    assert.ok(alerts.active.length > 0);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test('api provider can shape live status and fall back locally', async () => {
  const stateDir = mkdtempSync(path.join(tmpdir(), 'dzx-api-'));
  const sim = createApiServer(8789, stateDir);
  const server = await sim.listen();
  try {
    const provider = createDzxProvider('api', 'http://127.0.0.1:8789');
    const live = await provider.loadLiveStatus('user');
    const connectivity = await provider.loadConnectivity('user');
    assert.equal(live.siteName, 'Demo Plant');
    assert.equal(connectivity.deviceName, 'Dynamic Zero Export Controller');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(stateDir, { recursive: true, force: true });
  }

  const fallback = createDzxProvider('mock');
  const live = await fallback.loadLiveStatus('user');
  assert.equal(live.siteName.length > 0, true);
});
