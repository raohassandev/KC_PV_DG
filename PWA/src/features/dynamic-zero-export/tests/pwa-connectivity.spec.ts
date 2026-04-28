import test from 'node:test';
import assert from 'node:assert/strict';
import type { ConnectivitySnapshot } from '../../../../../dynamic_zero_export/pwa/contracts/connectivity';
import { buildConnectivityViewModel } from '../services/connectivityService';

const sampleSnapshot: ConnectivitySnapshot = {
  deviceName: 'Controller',
  firmwareVersion: '1.0.0',
  buildId: 'b1',
  wifi: {
    ssid: 'SiteLAN',
    signalDbm: -50,
    state: 'connected',
    ipAddress: '192.168.0.10',
  },
  lan: { state: 'connected', ipAddress: '192.168.0.11', macAddress: 'AA:BB:CC:DD:EE:FF' },
  reachability: { localApi: true, upstreamMeter: true, downstreamInverter: true },
  uptimeSec: 3600,
};

test('connectivity view model summarizes LAN and Wi-Fi', () => {
  const model = buildConnectivityViewModel('user', sampleSnapshot);
  assert.ok(model.summary.includes('Wi-Fi connected'));
  assert.ok(model.summary.includes('LAN connected'));
  assert.equal(model.snapshot.wifi.state, 'connected');
  assert.ok(model.detailLines.includes('API ok'));
});
