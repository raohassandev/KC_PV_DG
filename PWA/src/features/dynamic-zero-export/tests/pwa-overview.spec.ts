import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoleAwareLiveStatus } from '../services/liveStatusService';

test('overview view model includes owner-facing core values', () => {
  const model = buildRoleAwareLiveStatus('user');
  assert.ok(model.currentPowerKw > 0);
  assert.ok(model.solarKw > 0);
  assert.ok(model.gridExportKw >= 0);
  assert.ok(model.activeAlertCount >= 0);
});

