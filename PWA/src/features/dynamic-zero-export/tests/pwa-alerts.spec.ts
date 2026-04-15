import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAlertViewModel } from '../view-models/alerts';
import { alertsFixture } from '../mock/alerts';

test('user sees shortened alert messages', () => {
  const model = buildAlertViewModel(alertsFixture, 'user');
  assert.equal(model.role, 'user');
  assert.ok(model.items[0].message.length <= 72);
  assert.equal(model.items[0].debugDetails, undefined);
});

test('manufacturer sees debug alert details', () => {
  const model = buildAlertViewModel(alertsFixture, 'manufacturer');
  assert.ok(model.items[0].debugDetails?.includes('profile checksum ok'));
});
