import test from 'node:test';
import assert from 'node:assert/strict';
import { connectivityFixture } from '../pwa/mock/connectivity.fixture';
import { connectivitySummary } from '../pwa/contracts/connectivity';
import { connectivityViewModel } from '../pwa/view-models/connectivity';

test('connectivity summary is readable', () => {
  assert.match(connectivitySummary(connectivityFixture), /Wi-Fi connected/);
  const viewModel = connectivityViewModel(connectivityFixture);
  assert.equal(viewModel.status, 'healthy');
  assert.ok(viewModel.summary.includes('LAN: connected'));
});

