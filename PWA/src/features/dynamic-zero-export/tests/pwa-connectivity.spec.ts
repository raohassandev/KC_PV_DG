import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConnectivityViewModel } from '../view-models/connectivity';
import { connectivityFixture } from '../mock/connectivity';

test('connectivity view model summarizes LAN and Wi-Fi', () => {
  const model = buildConnectivityViewModel(connectivityFixture);
  assert.ok(model.summary.includes('Wi-Fi connected'));
  assert.ok(model.summary.includes('LAN connected'));
  assert.equal(model.connected, true);
});
