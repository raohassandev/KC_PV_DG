import type { LiveStatusSnapshot } from '../contracts/dashboard';

export const liveStatusFixture: LiveStatusSnapshot = {
  role: 'user',
  siteName: 'Demo Plant',
  systemState: 'healthy',
  powerKw: 125.4,
  solarKw: 130.2,
  gridImportKw: 2.1,
  gridExportKw: 6.8,
  generatorKw: 0,
  deviceOnline: true,
  connectivityLabel: 'LAN connected',
  alertsCount: 1,
  localNetworkLabel: 'AP mode',
  lastUpdatedAt: '2026-04-15T00:00:00Z',
};

