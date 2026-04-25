import test from 'node:test';
import assert from 'node:assert/strict';
import { deviceExample, liveStatusExample, connectivityExample, alertsExample, historyExample, commissioningExample, configReviewExample, sessionExample } from '../../../../../dynamic_zero_export/api_contract/examples';
import { toLiveStatusSnapshot, toConnectivitySnapshot, toAlertFeed, toHistoryBundle } from '../services/apiTransforms';

test('history contract parsing preserves sample data', () => {
  const bundle = toHistoryBundle(historyExample);
  assert.equal(bundle.today.points.length, historyExample.today.length);
  assert.equal(bundle.month.points.length, historyExample.month.length);
  assert.equal(bundle.year.points.length, historyExample.year.length);
  assert.equal(bundle.decade.points.length, historyExample.decade.length);
});

test('history wire without year/decade falls back from legacy lifetime', () => {
  const legacy = {
    today: historyExample.today,
    month: historyExample.month,
    lifetime: historyExample.decade,
    totals: historyExample.totals,
    range: 'today' as const,
    resolution: 'hour' as const,
  };
  const bundle = toHistoryBundle(legacy as never);
  assert.equal(bundle.year.points.length, historyExample.year.length);
  assert.equal(bundle.decade.points.length, historyExample.decade.length);
});

test('alerts contract parsing preserves active alarms', () => {
  const feed = toAlertFeed(alertsExample);
  assert.equal(feed.active.length, alertsExample.active.length);
  assert.equal(feed.summary.warningCount, alertsExample.summary.warningCount);
});

test('connectivity contract parsing preserves wifi and api state', () => {
  const snapshot = toConnectivitySnapshot(connectivityExample);
  assert.equal(snapshot.wifi.state, 'connected');
  assert.equal(snapshot.reachability.localApi, true);
});

test('live status contract parsing keeps owner-facing fields', () => {
  const snapshot = toLiveStatusSnapshot(liveStatusExample);
  assert.equal(snapshot.siteName, liveStatusExample.siteName);
  assert.equal(snapshot.alertsCount, liveStatusExample.alertsCount);
});

test('example payloads stay structurally complete', () => {
  assert.equal(deviceExample.deviceId, 'dzx-001');
  assert.ok(commissioningExample.warnings.length > 0);
  assert.ok(configReviewExample.reviewLines.length > 0);
  assert.equal(sessionExample.accessMode, 'local');
});

