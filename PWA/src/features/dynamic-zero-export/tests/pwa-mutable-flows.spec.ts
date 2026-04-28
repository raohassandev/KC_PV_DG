import { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../../../../../dynamic_zero_export/api_simulator';
import { createLocalDeviceService } from '../services/localDeviceService';

test('provider mode and connectivity settings update through the api service', async () => {
  const stateDir = mkdtempSync(path.join(tmpdir(), 'dzx-mut-'));
  const sim = createApiServer(8791, stateDir);
  const server = await sim.listen();
  try {
    const service = createLocalDeviceService('api', 'http://127.0.0.1:8791');
    await service.setProviderMode('api');
    await service.updateConnectivitySettings({
      deviceName: 'Installer Controller',
      wifi: { ssid: 'PlantLAN' },
      lan: { state: 'connected', ipAddress: '192.168.0.77' },
    });
    const connectivity = await service.loadConnectivity('installer');
    assert.equal(connectivity.deviceName, 'Installer Controller');
    assert.equal(connectivity.wifi.ssid, 'PlantLAN');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test('alert acknowledgement and history append are accepted', async () => {
  const stateDir = mkdtempSync(path.join(tmpdir(), 'dzx-mut-'));
  const sim = createApiServer(8792, stateDir);
  const server = await sim.listen();
  try {
    const service = createLocalDeviceService('api', 'http://127.0.0.1:8792');
    await service.acknowledgeAlerts(['a1']);
    const alerts = await service.loadAlerts('user');
    assert.equal(alerts.active[0].acknowledged, true);
    const appendBody = {
      range: 'today',
      resolution: 'hour',
      today: [
        {
          timestamp: '2026-04-16T01:00:00Z',
          solarKwh: 0.5,
          gridImportKwh: 0,
          gridExportKwh: 0.2,
          generatorKwh: 0,
          curtailedKwh: 0,
        },
      ],
    };
    const appendStatus = await new Promise<number>((resolve, reject) => {
      const req = http.request(
        'http://127.0.0.1:8792/api/sim/history-append',
        { method: 'POST', headers: { 'content-type': 'application/json' } },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode ?? 0));
        },
      );
      req.on('error', reject);
      req.end(JSON.stringify(appendBody));
    });
    assert.equal(appendStatus, 200);
    const history = await service.loadHistory('user');
    assert.ok(history.today.points.length >= 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(stateDir, { recursive: true, force: true });
  }
});

