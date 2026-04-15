import type { AlertFeed } from '../contracts/alerts';

export const alertsFixture: AlertFeed = {
  active: [
    {
      id: 'a1',
      code: 'METER_STALE',
      severity: 'warning',
      title: 'Meter data stale',
      message: 'Upstream meter stopped updating more than 10 seconds ago',
      timestamp: '2026-04-15T00:00:00Z',
      source: 'meter',
      debugDetails: 'poll timeout count = 3',
    },
  ],
  history: [
    {
      id: 'a0',
      code: 'CONFIG_LOADED',
      severity: 'info',
      title: 'Configuration loaded',
      message: 'Commissioning profile loaded successfully',
      timestamp: '2026-04-15T00:00:00Z',
      source: 'commissioning',
      debugDetails: 'profile checksum ok',
    },
  ],
  summary: { criticalCount: 0, warningCount: 1, infoCount: 1 },
};
