import test from 'node:test';
import assert from 'node:assert/strict';
import type { AlertFeed } from '../pwa/contracts/alerts';
import { buildAlertViewModel } from '../pwa/view-models/alerts';

const activeAlert = {
  id: 'a1',
  code: 'METER_STALE',
  severity: 'warning' as const,
  title: 'Meter data stale',
  message: 'Upstream meter stopped updating more than 10 seconds ago',
  timestamp: '2026-04-15T00:00:00Z',
  source: 'meter' as const,
  debugDetails: 'poll timeout count = 3',
};

const sampleFeed: AlertFeed = {
  active: [activeAlert],
  history: [{ ...activeAlert }],
  summary: { criticalCount: 0, warningCount: 1, infoCount: 0 },
};

test('alert visibility changes by role', () => {
  const userView = buildAlertViewModel(sampleFeed, 'user');
  const manufacturerView = buildAlertViewModel(sampleFeed, 'manufacturer');
  assert.ok(!('debugDetails' in userView.items[0]));
  assert.ok(manufacturerView.items[0].debugDetails);
  assert.equal(userView.summary.warningCount, 1);
});
