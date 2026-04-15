import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAlertsViewModel } from '../services/alertsService';
import { alertsFixture } from '../mock/alerts';

test('user sees shortened alert messages', () => {
  const model = buildAlertsViewModel('user', alertsFixture);
  assert.equal(model.role, 'user');
  assert.ok(model.view.items[0].message.length <= 72);
  assert.equal(model.view.items[0].debugDetails, undefined);
});

test('manufacturer sees debug alert details', () => {
  const model = buildAlertsViewModel('manufacturer', alertsFixture);
  assert.ok(model.view.items.some((item) => item.debugDetails));
});
