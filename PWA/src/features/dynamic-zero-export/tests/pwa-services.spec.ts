import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSession, saveSession, updateRole } from '../services/sessionService';
import { loadLiveStatus, buildRoleAwareLiveStatus } from '../services/liveStatusService';
import { loadHistoryBundle, buildHistoryViewModel } from '../services/historyService';
import { loadAlertFeed, buildAlertsViewModel } from '../services/alertsService';
import { loadConnectivitySnapshot, buildConnectivityViewModel } from '../services/connectivityService';

test('session service loads defaults and updates role', () => {
  const session = loadSession();
  const updated = updateRole(session, 'installer');
  assert.equal(updated.role, 'installer');
  assert.equal(saveSession(updated).role, 'installer');
});

test('live status service returns snapshot', () => {
  const snapshot = loadLiveStatus();
  assert.ok(typeof snapshot.siteName === 'string');
  assert.ok(Number.isFinite(snapshot.powerKw));
  assert.ok(snapshot.lastUpdatedAt.length > 0);
});

test('live status shapes by role', () => {
  const user = buildRoleAwareLiveStatus('user');
  const installer = buildRoleAwareLiveStatus('installer');
  assert.equal(user.role, 'user');
  assert.equal(installer.role, 'installer');
  assert.ok(installer.summary.length >= user.summary.length);
});

test('history service loads bundle and shapes totals', () => {
  const bundle = loadHistoryBundle();
  const model = buildHistoryViewModel('user', bundle);
  assert.equal(model.totals.today.solarKwh, 0);
  assert.ok(model.highlights.length >= 3);
});

test('alerts service loads and shapes role-aware feed', () => {
  const feed = loadAlertFeed();
  const user = buildAlertsViewModel('user', feed);
  const manufacturer = buildAlertsViewModel('manufacturer', feed);
  assert.ok(user.summary[0].startsWith('critical='));
  assert.ok(manufacturer.view.items.length >= user.view.items.length);
});

test('connectivity service loads snapshot and shapes summary', () => {
  const snapshot = loadConnectivitySnapshot();
  const model = buildConnectivityViewModel('installer', snapshot);
  assert.ok(model.summary.includes('Wi-Fi'));
  assert.ok(model.detailLines.length >= 4);
});
