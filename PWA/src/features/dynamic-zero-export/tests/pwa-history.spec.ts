import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEnergyHistoryViewModel } from '../view-models/energy-history';
import {
  lifetimeHistoryFixture,
  monthHistoryFixture,
  todayHistoryFixture,
} from '../mock/history';

test('history view model carries totals and highlights', () => {
  const model = buildEnergyHistoryViewModel(
    todayHistoryFixture,
    monthHistoryFixture,
    lifetimeHistoryFixture,
  );

  assert.equal(model.today.points.length, 2);
  assert.equal(model.month.points.length, 1);
  assert.equal(model.lifetime.points.length, 1);
  assert.equal(model.totals.today.solarKwh.toFixed(1), '2.6');
  assert.ok(model.highlights[0].startsWith('Today points:'));
});

