import test from 'node:test';
import assert from 'node:assert/strict';
import type { ConnectivitySnapshot } from '../pwa/contracts/connectivity';
import { connectivitySummary } from '../pwa/contracts/connectivity';
import { connectivityViewModel } from '../pwa/view-models/connectivity';

const sampleSnapshot: ConnectivitySnapshot = {
  deviceName: 'Dynamic Zero Export Controller',
  firmwareVersion: '0.1.0-dev',
  buildId: 'dev-0001',
  wifi: {
    ssid: 'Plant-WiFi',
    signalDbm: -51,
    state: 'connected',
    ipAddress: '192.168.0.50',
    lastSeenAt: '2026-04-15T00:00:00Z',
  },
  lan: {
    state: 'connected',
    ipAddress: '192.168.0.50',
    macAddress: 'AA:BB:CC:DD:EE:FF',
  },
  reachability: { localApi: true, upstreamMeter: true, downstreamInverter: true },
  uptimeSec: 3600,
};

test('connectivity summary is readable', () => {
  assert.match(connectivitySummary(sampleSnapshot), /Wi-Fi connected/);
  const viewModel = connectivityViewModel(sampleSnapshot);
  assert.equal(viewModel.status, 'healthy');
  assert.ok(viewModel.summary.includes('LAN: connected'));
});
