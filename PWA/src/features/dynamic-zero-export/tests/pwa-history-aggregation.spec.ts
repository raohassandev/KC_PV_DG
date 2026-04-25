import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateEnergyTotals } from '../types';
import { todayHistoryFixture } from '../mock/history';

test('history aggregation sums samples deterministically', () => {
  const totals = aggregateEnergyTotals(todayHistoryFixture.points);
  assert.equal(todayHistoryFixture.points.length, 24);
  assert.ok(totals.solarKwh > 20 && totals.solarKwh < 35, `solar sum ${totals.solarKwh}`);
  assert.ok(totals.gridExportKwh > 5 && totals.gridExportKwh < 20, `export sum ${totals.gridExportKwh}`);
});

