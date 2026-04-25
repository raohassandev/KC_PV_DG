import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEnergyHistoryViewModel } from '../view-models/history';

test('history view model carries totals and highlights', () => {
  const model = buildEnergyHistoryViewModel('user');

  assert.equal(model.today.points.length, 24);
  assert.equal(model.month.points.length, 30);
  assert.equal(model.year.points.length, 12);
  assert.equal(model.decade.points.length, 10);
  assert.ok(model.highlights.some((item) => item.includes('Day (hourly) solar')));
  assert.ok(model.highlights[0].startsWith('Role:'));
});
