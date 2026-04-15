import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../../../../../dynamic_zero_export/api_simulator';
import { createLocalDeviceService } from '../services/localDeviceService';

test('provider mode and connectivity settings update through the api service', async () => {
  const sim = createApiServer(8791);
  const server = await sim.listen();
  try {
    const service = createLocalDeviceService('api', 'http://127.0.0.1:8791');
    await service.setProviderMode('installer');
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
  }
});

test('alert acknowledgement and history append are accepted', async () => {
  const sim = createApiServer(8792);
  const server = await sim.listen();
  try {
    const service = createLocalDeviceService('api', 'http://127.0.0.1:8792');
    await service.acknowledgeAlerts(['a1']);
    const alerts = await service.loadAlerts('user');
    assert.equal(alerts.active[0].acknowledged, true);
    await service.appendHistory({
      range: 'today',
      resolution: '5m',
      today: [{ timestamp: '2026-04-16T01:00:00Z', solarKwh: 0.5, gridImportKwh: 0, gridExportKwh: 0.2, generatorKwh: 0, curtailedKwh: 0 }],
    });
    const history = await service.loadHistory('user');
    assert.ok(history.today.points.length >= 3);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

