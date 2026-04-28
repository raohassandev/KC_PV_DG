import test from 'node:test';
import assert from 'node:assert/strict';
import type { AlertFeed } from '../../../../../dynamic_zero_export/pwa/contracts/alerts';
import { buildAlertsViewModel } from '../services/alertsService';

const activeAlert = {
  id: 'a1',
  code: 'METER_STALE',
  severity: 'warning' as const,
  title: 'Meter data stale',
  message:
    'Upstream meter stopped updating more than ten seconds ago; check wiring and baud rate before continuing.',
  timestamp: '2026-04-15T00:00:00Z',
  source: 'meter' as const,
  debugDetails: 'poll timeout count = 3',
};

const sampleFeed: AlertFeed = {
  active: [activeAlert],
  history: [{ ...activeAlert }],
  summary: { criticalCount: 0, warningCount: 1, infoCount: 0 },
};

test('user sees shortened alert messages', () => {
  const model = buildAlertsViewModel('user', sampleFeed);
  assert.equal(model.role, 'user');
  assert.ok(model.view.items[0].message.length <= 72);
  assert.equal(model.view.items[0].debugDetails, undefined);
});

test('manufacturer sees debug alert details', () => {
  const model = buildAlertsViewModel('manufacturer', sampleFeed);
  assert.ok(model.view.items.some((item) => item.debugDetails));
});
