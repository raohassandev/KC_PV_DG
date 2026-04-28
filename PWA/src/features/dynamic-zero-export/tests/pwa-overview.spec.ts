import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoleAwareLiveStatus } from '../services/liveStatusService';

test('live status executive model includes owner-facing core values', () => {
  const model = buildRoleAwareLiveStatus('user');
  assert.equal(model.role, 'user');
  assert.ok(Number.isFinite(model.currentPowerKw));
  assert.ok(Number.isFinite(model.solarKw));
  assert.ok(model.gridExportKw >= 0);
  assert.ok(model.activeAlertCount >= 0);
  assert.ok(model.summary.length > 0);
});

