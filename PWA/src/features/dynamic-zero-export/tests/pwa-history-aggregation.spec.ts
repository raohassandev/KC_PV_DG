import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateEnergyTotals } from '../types';

test('history aggregation sums samples deterministically', () => {
  const points = [
    {
      timestamp: '2026-04-15T00:00:00Z',
      solarKwh: 1,
      gridImportKwh: 0.5,
      gridExportKwh: 0.25,
      generatorKwh: 0.1,
      curtailedKwh: 0.05,
    },
    {
      timestamp: '2026-04-15T01:00:00Z',
      solarKwh: 2,
      gridImportKwh: 0.5,
      gridExportKwh: 0.25,
      generatorKwh: 0.1,
      curtailedKwh: 0.05,
    },
  ];
  const totals = aggregateEnergyTotals(points);
  assert.equal(points.length, 2);
  assert.equal(totals.solarKwh, 3);
  assert.equal(totals.gridImportKwh, 1);
  assert.equal(totals.gridExportKwh, 0.5);
  assert.equal(totals.generatorKwh, 0.2);
  assert.equal(totals.curtailedKwh, 0.1);
});
