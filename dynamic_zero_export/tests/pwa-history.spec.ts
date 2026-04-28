import test from 'node:test';
import assert from 'node:assert/strict';
import type { EnergyHistoryPoint, EnergyHistorySeries } from '../pwa/contracts/history';
import { aggregateEnergy } from '../pwa/contracts/history';
import { buildEnergyHistoryViewModel } from '../pwa/view-models/energy-history';

const hourPoint = (h: number, solar: number): EnergyHistoryPoint => ({
  timestamp: `2026-04-15T${String(h).padStart(2, '0')}:00:00Z`,
  solarKwh: solar,
  gridImportKwh: 0.1,
  gridExportKwh: 0.05,
  generatorKwh: 0,
  curtailedKwh: 0,
});

const today: EnergyHistorySeries = { granularity: 'hour', points: [hourPoint(0, 1), hourPoint(1, 2)] };
const month: EnergyHistorySeries = { granularity: 'day', points: [] };
const year: EnergyHistorySeries = { granularity: 'month', points: [] };
const decade: EnergyHistorySeries = { granularity: 'year', points: [] };

test('energy history aggregation and view model are shaped for charts', () => {
  const totals = aggregateEnergy(today.points);
  assert.equal(totals.solarKwh, 3);
  const viewModel = buildEnergyHistoryViewModel(today, month, year, decade);
  assert.equal(viewModel.today.granularity, 'hour');
  assert.ok(viewModel.highlights.length > 0);
});
