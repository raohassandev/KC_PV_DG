import test from 'node:test';
import assert from 'node:assert/strict';
import type { EnergyHistoryPoint } from '../../../../../dynamic_zero_export/pwa/contracts/history';
import { buildHistoryViewModel, type HistoryBundle } from '../services/historyService';

function point(ts: string, solarKwh: number): EnergyHistoryPoint {
  return {
    timestamp: ts,
    solarKwh,
    gridImportKwh: 0.1,
    gridExportKwh: 0.05,
    generatorKwh: 0,
    curtailedKwh: 0,
  };
}

function syntheticHistoryBundle(): HistoryBundle {
  return {
    today: {
      granularity: 'hour',
      points: Array.from({ length: 24 }, (_, h) =>
        point(`2026-04-15T${String(h).padStart(2, '0')}:00:00Z`, 1 + h * 0.01),
      ),
    },
    month: {
      granularity: 'day',
      points: Array.from({ length: 30 }, (_, d) =>
        point(`2026-04-${String(d + 1).padStart(2, '0')}T00:00:00Z`, 5),
      ),
    },
    year: {
      granularity: 'month',
      points: Array.from({ length: 12 }, (_, m) =>
        point(`2026-${String(m + 1).padStart(2, '0')}-01T00:00:00Z`, 50),
      ),
    },
    decade: {
      granularity: 'year',
      points: Array.from({ length: 10 }, (_, y) => point(`${2017 + y}-01-01T00:00:00Z`, 1000 + y)),
    },
  };
}

test('history view model carries totals and highlights', () => {
  const model = buildHistoryViewModel('user', syntheticHistoryBundle());

  assert.equal(model.today.points.length, 24);
  assert.equal(model.month.points.length, 30);
  assert.equal(model.year.points.length, 12);
  assert.equal(model.decade.points.length, 10);
  assert.ok(model.highlights.some((item) => item.includes('Day (hourly) solar')));
  assert.ok(model.highlights[0].startsWith('Role:'));
});
