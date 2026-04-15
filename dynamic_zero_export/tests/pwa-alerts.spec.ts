import test from 'node:test';
import assert from 'node:assert/strict';
import { alertsFixture } from '../pwa/mock/alerts.fixture';
import { buildAlertViewModel } from '../pwa/view-models/alerts';

test('alert visibility changes by role', () => {
  const userView = buildAlertViewModel(alertsFixture, 'user');
  const manufacturerView = buildAlertViewModel(alertsFixture, 'manufacturer');
  assert.ok(!('debugDetails' in userView.items[0]));
  assert.ok(manufacturerView.items[0].debugDetails);
  assert.equal(userView.summary.warningCount, 1);
});
