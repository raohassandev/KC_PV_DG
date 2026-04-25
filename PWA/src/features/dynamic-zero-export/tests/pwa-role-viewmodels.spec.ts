import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoleAwareLiveStatus } from '../services/liveStatusService';
import { buildAlertsViewModel } from '../services/alertsService';
import { alertsFixture } from '../mock/alerts';

test('installer live-status block exposes the same snapshot with role context', () => {
  const model = buildRoleAwareLiveStatus('installer');
  assert.equal(model.role, 'installer');
  assert.ok(model.summary.length > 0);
});

test('manufacturer alert view includes debug-ready structure', () => {
  const model = buildAlertsViewModel('manufacturer', alertsFixture);
  assert.ok(model.view.items[0].debugDetails);
});

