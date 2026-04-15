import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConnectivityViewModel } from '../services/connectivityService';
import { connectivityFixture } from '../mock/connectivity';

test('connectivity summary is friendly and structured', () => {
  const model = buildConnectivityViewModel('user', connectivityFixture);
  assert.ok(model.summary.includes('Wi-Fi'));
  assert.ok(model.detailLines.some((line) => line.startsWith('API ')));
});

