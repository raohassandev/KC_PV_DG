import type { EnergyHistorySeries } from '../contracts/history';

export const todayHistoryFixture: EnergyHistorySeries = {
  granularity: '5m',
  points: [
    { timestamp: '2026-04-15T08:00:00Z', solarKwh: 1.2, gridImportKwh: 0.1, gridExportKwh: 0.8, generatorKwh: 0, curtailedKwh: 0 },
    { timestamp: '2026-04-15T08:05:00Z', solarKwh: 1.4, gridImportKwh: 0.0, gridExportKwh: 1.0, generatorKwh: 0, curtailedKwh: 0.1 },
  ],
};

export const monthHistoryFixture: EnergyHistorySeries = {
  granularity: 'day',
  points: [
    { timestamp: '2026-04-01T00:00:00Z', solarKwh: 120, gridImportKwh: 4, gridExportKwh: 32, generatorKwh: 0, curtailedKwh: 2 },
  ],
};

export const lifetimeHistoryFixture: EnergyHistorySeries = {
  granularity: 'month',
  points: [
    { timestamp: '2026-01-01T00:00:00Z', solarKwh: 1200, gridImportKwh: 80, gridExportKwh: 320, generatorKwh: 25, curtailedKwh: 20 },
  ],
};

