import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEnergyHistoryViewModel } from '../view-models/history';

test('history view model carries totals and highlights', () => {
  const model = buildEnergyHistoryViewModel('user');

  assert.equal(model.today.points.length, 2);
  assert.equal(model.month.points.length, 1);
  assert.equal(model.lifetime.points.length, 1);
  assert.ok(model.highlights.some((item) => item.includes('Today solar')));
  assert.ok(model.highlights[0].startsWith('Role:'));
});
