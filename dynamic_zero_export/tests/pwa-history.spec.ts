import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateEnergy } from '../pwa/contracts/history';
import { buildEnergyHistoryViewModel } from '../pwa/view-models/energy-history';
import { lifetimeHistoryFixture, monthHistoryFixture, todayHistoryFixture } from '../pwa/mock/history.fixture';

test('energy history aggregation and view model are shaped for charts', () => {
  const totals = aggregateEnergy(todayHistoryFixture.points);
  assert.ok(totals.solarKwh > 0);
  const viewModel = buildEnergyHistoryViewModel(todayHistoryFixture, monthHistoryFixture, lifetimeHistoryFixture);
  assert.equal(viewModel.today.granularity, '5m');
  assert.ok(viewModel.highlights.length > 0);
});

