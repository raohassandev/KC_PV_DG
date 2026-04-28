import test from 'node:test';
import assert from 'node:assert/strict';
import type { AlertFeed } from '../../../../../dynamic_zero_export/pwa/contracts/alerts';
import { buildRoleAwareLiveStatus } from '../services/liveStatusService';
import { buildAlertsViewModel } from '../services/alertsService';

const activeAlert = {
  id: 'a1',
  code: 'METER_STALE',
  severity: 'warning' as const,
  title: 'Meter data stale',
  message: 'Meter data is delayed',
  timestamp: '2026-04-15T00:00:00Z',
  source: 'meter' as const,
  debugDetails: 'poll timeout count = 3',
};

const sampleFeed: AlertFeed = {
  active: [activeAlert],
  history: [{ ...activeAlert }],
  summary: { criticalCount: 0, warningCount: 1, infoCount: 0 },
};

test('installer live-status block exposes the same snapshot with role context', () => {
  const model = buildRoleAwareLiveStatus('installer');
  assert.equal(model.role, 'installer');
  assert.ok(model.summary.length > 0);
});

test('manufacturer alert view includes debug-ready structure', () => {
  const model = buildAlertsViewModel('manufacturer', sampleFeed);
  assert.ok(model.view.items[0].debugDetails);
});
