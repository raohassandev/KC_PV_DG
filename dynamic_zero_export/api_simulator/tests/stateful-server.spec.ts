import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApiServer } from '../server';
import { createDeviceServiceStorage } from '../storage';
import { createDeviceServiceRuntime } from '../runtime';

function request(baseUrl: string, method: string, pathname: string, body?: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, baseUrl);
    const req = http.request(
      url,
      { method, headers: { 'content-type': 'application/json' } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve(text ? JSON.parse(text) : {});
        });
      },
    );
    req.on('error', reject);
    if (body !== undefined) req.end(JSON.stringify(body));
    else req.end();
  });
}

test('storage persists and resets state', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'dzx-state-'));
  const storage = createDeviceServiceStorage(dir);
  const runtime = createDeviceServiceRuntime(storage);
  const before = runtime.load();
  runtime.handlers.postProviderMode({ mode: 'api' });
  const saved = runtime.persist();
  assert.equal(saved.session.accessMode, 'remote');
  const reset = runtime.reset();
  assert.equal(reset.session.role, before.session.role);
  rmSync(dir, { recursive: true, force: true });
});

test('api server exposes mutable endpoints', async () => {
  const server = createApiServer(8790);
  const httpServer = await server.listen();
  try {
    const base = 'http://127.0.0.1:8790';
    const device = await request(base, 'GET', '/api/device/info');
    assert.equal(device.deviceId, 'dzx-001');
    const initial = await request(base, 'GET', '/api/session');
    assert.equal(initial.role, 'user');

    const updated = await request(base, 'POST', '/api/provider-mode', { mode: 'api' });
    assert.equal(updated.accessMode, 'remote');

    const connectivity = await request(base, 'POST', '/api/connectivity/settings', {
      deviceName: 'Updated Controller',
      wifi: { ssid: 'NewSSID' },
      lan: { state: 'connected', ipAddress: '192.168.0.90' },
    });
    assert.equal(connectivity.deviceName, 'Updated Controller');
    assert.equal(connectivity.wifi.ssid, 'NewSSID');

    const alerts = await request(base, 'POST', '/api/alerts/ack', { ids: ['a1'] });
    assert.equal(alerts.active[0].acknowledged, true);

    const commissioning = await request(base, 'GET', '/api/commissioning-summary');
    assert.equal(commissioning.siteName, 'Demo Plant');

    const history = await request(base, 'POST', '/api/sim/history-append', {
      range: 'today',
      resolution: '5m',
      today: [{ timestamp: '2026-04-16T01:00:00Z', solarKwh: 0.5, gridImportKwh: 0, gridExportKwh: 0.2, generatorKwh: 0, curtailedKwh: 0 }],
    });
    assert.ok(history.today.length >= 3);
  } finally {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  }
});
