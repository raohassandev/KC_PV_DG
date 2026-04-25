import type { EnergyHistoryPoint, EnergyHistorySeries } from '../contracts/history';

/** One calendar day (UTC), hourly buckets — 24 points. */
export const todayHistoryFixture: EnergyHistorySeries = {
  granularity: 'hour',
  points: Array.from({ length: 24 }, (_, h) => {
    const peak = h >= 7 && h <= 17 ? Math.sin(((h - 7) / 10) * Math.PI) : 0;
    const solar = 0.12 + peak * 3.4;
    const gridEx = peak * 1.1;
    return {
      timestamp: `2026-04-15T${String(h).padStart(2, '0')}:00:00Z`,
      solarKwh: Math.round(solar * 100) / 100,
      gridImportKwh: Math.round((0.04 + peak * 0.08) * 100) / 100,
      gridExportKwh: Math.round(gridEx * 100) / 100,
      generatorKwh: h % 12 === 0 ? 0.2 : 0,
      curtailedKwh: Math.round(peak * 0.05 * 100) / 100,
    } satisfies EnergyHistoryPoint;
  }),
};

/** One calendar month (April 2026), daily buckets — 30 points. */
export const monthHistoryFixture: EnergyHistorySeries = {
  granularity: 'day',
  points: Array.from({ length: 30 }, (_, d) => {
    const day = d + 1;
    const wobble = 0.85 + 0.15 * Math.sin((d / 30) * Math.PI * 2);
    const solar = 95 + d * 0.6 * wobble;
    return {
      timestamp: `2026-04-${String(day).padStart(2, '0')}T00:00:00Z`,
      solarKwh: Math.round(solar * 10) / 10,
      gridImportKwh: Math.round((3.2 + (d % 5)) * 10) / 10,
      gridExportKwh: Math.round((24 + d * 0.4) * 10) / 10,
      generatorKwh: d % 7 === 0 ? 4 : 0,
      curtailedKwh: Math.round((1.2 + (d % 3) * 0.2) * 10) / 10,
    } satisfies EnergyHistoryPoint;
  }),
};

/** Trailing 12 months ending Apr 2026, monthly buckets — 12 points. */
export const yearHistoryFixture: EnergyHistorySeries = {
  granularity: 'month',
  points: [
    '2025-05',
    '2025-06',
    '2025-07',
    '2025-08',
    '2025-09',
    '2025-10',
    '2025-11',
    '2025-12',
    '2026-01',
    '2026-02',
    '2026-03',
    '2026-04',
  ].map((ym, i) => {
    const base = 2100 + i * 45;
    return {
      timestamp: `${ym}-01T00:00:00Z`,
      solarKwh: Math.round(base * 10) / 10,
      gridImportKwh: 60 + i * 4,
      gridExportKwh: 280 + i * 12,
      generatorKwh: i % 4 === 0 ? 18 : 0,
      curtailedKwh: 12 + i,
    } satisfies EnergyHistoryPoint;
  }),
};

/** Last 10 full years ending 2026, yearly buckets — 10 points. */
export const decadeHistoryFixture: EnergyHistorySeries = {
  granularity: 'year',
  points: Array.from({ length: 10 }, (_, y) => {
    const year = 2017 + y;
    const solar = 18500 + y * 420 + (y % 2) * 200;
    return {
      timestamp: `${year}-01-01T00:00:00Z`,
      solarKwh: Math.round(solar * 10) / 10,
      gridImportKwh: 520 + y * 28,
      gridExportKwh: 3100 + y * 140,
      generatorKwh: 120 + y * 15,
      curtailedKwh: 180 + y * 12,
    } satisfies EnergyHistoryPoint;
  }),
};
