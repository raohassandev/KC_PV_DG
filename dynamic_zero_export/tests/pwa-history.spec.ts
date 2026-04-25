import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateEnergy } from '../pwa/contracts/history';
import { buildEnergyHistoryViewModel } from '../pwa/view-models/energy-history';
import {
  decadeHistoryFixture,
  monthHistoryFixture,
  todayHistoryFixture,
  yearHistoryFixture,
} from '../pwa/mock/history.fixture';

test('energy history aggregation and view model are shaped for charts', () => {
  const totals = aggregateEnergy(todayHistoryFixture.points);
  assert.ok(totals.solarKwh > 0);
  const viewModel = buildEnergyHistoryViewModel(
    todayHistoryFixture,
    monthHistoryFixture,
    yearHistoryFixture,
    decadeHistoryFixture,
  );
  assert.equal(viewModel.today.granularity, 'hour');
  assert.ok(viewModel.highlights.length > 0);
});

