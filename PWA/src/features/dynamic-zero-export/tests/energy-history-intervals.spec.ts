import test from 'node:test';
import assert from 'node:assert/strict';
import type { EnergyHistoryPoint } from '../../../../../dynamic_zero_export/pwa/contracts/history';
import { bucketWeekly, pointsForInterval } from '../lib/energyHistoryIntervals';
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

test('weekly buckets group daily points in chunks of seven', () => {
  const model = buildHistoryViewModel('user', syntheticHistoryBundle());
  const w = bucketWeekly(model.month.points);
  assert.equal(model.month.points.length, 30);
  assert.equal(w.length, 5);
});

test('pointsForInterval maps hourly daily weekly monthly', () => {
  const model = buildHistoryViewModel('user', syntheticHistoryBundle());
  assert.equal(pointsForInterval(model, 'hourly').length, 24);
  assert.equal(pointsForInterval(model, 'daily').length, 30);
  assert.equal(pointsForInterval(model, 'weekly').length, 5);
  assert.equal(pointsForInterval(model, 'monthly').length, 12);
});
