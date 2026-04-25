import test from 'node:test';
import assert from 'node:assert/strict';
import { bucketWeekly, pointsForInterval } from '../lib/energyHistoryIntervals';
import { buildEnergyHistoryViewModel } from '../view-models/history';

test('weekly buckets group daily points in chunks of seven', () => {
  const model = buildEnergyHistoryViewModel('user');
  const w = bucketWeekly(model.month.points);
  assert.equal(model.month.points.length, 30);
  assert.equal(w.length, 5);
});

test('pointsForInterval maps hourly daily weekly monthly', () => {
  const model = buildEnergyHistoryViewModel('user');
  assert.equal(pointsForInterval(model, 'hourly').length, 24);
  assert.equal(pointsForInterval(model, 'daily').length, 30);
  assert.equal(pointsForInterval(model, 'weekly').length, 5);
  assert.equal(pointsForInterval(model, 'monthly').length, 12);
});
