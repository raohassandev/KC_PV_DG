import test from 'node:test';
import assert from 'node:assert/strict';
import type { ConnectivitySnapshot } from '../../../../../dynamic_zero_export/pwa/contracts/connectivity';
import { buildConnectivityViewModel } from '../services/connectivityService';

const sampleSnapshot: ConnectivitySnapshot = {
  deviceName: 'Controller',
  firmwareVersion: '1.0.0',
  buildId: 'b1',
  wifi: { ssid: 'X', state: 'connected', ipAddress: '10.0.0.2' },
  lan: { state: 'connected', ipAddress: '10.0.0.3' },
  reachability: { localApi: true, upstreamMeter: false, downstreamInverter: false },
  uptimeSec: 1,
};

test('connectivity summary is friendly and structured', () => {
  const model = buildConnectivityViewModel('user', sampleSnapshot);
  assert.ok(model.summary.includes('Wi-Fi'));
  assert.ok(model.detailLines.some((line) => line.startsWith('API ')));
});
