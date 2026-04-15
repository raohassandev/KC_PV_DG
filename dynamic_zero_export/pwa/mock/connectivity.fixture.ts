import type { ConnectivitySnapshot } from '../contracts/connectivity';

export const connectivityFixture: ConnectivitySnapshot = {
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

