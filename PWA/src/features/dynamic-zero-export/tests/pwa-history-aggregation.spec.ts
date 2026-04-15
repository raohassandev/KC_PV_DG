import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateEnergyTotals } from '../types';
import { todayHistoryFixture } from '../mock/history';

test('history aggregation sums samples deterministically', () => {
  const totals = aggregateEnergyTotals(todayHistoryFixture.points);
  assert.equal(totals.solarKwh.toFixed(1), '2.6');
  assert.equal(totals.gridExportKwh.toFixed(1), '1.8');
});

