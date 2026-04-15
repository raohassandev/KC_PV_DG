import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDynamicZeroExportConfig } from '../schema/site-config.types';
import { buildSiteRuntime } from '../runtime/site-model';
import { evaluatePolicy } from '../runtime/policy-engine';
import { buildMonitoringSnapshot } from '../monitoring/snapshot-builder';

test('monitoring snapshot includes controller status and summary', () => {
  const runtime = buildSiteRuntime(defaultDynamicZeroExportConfig);
  const policy = evaluatePolicy(runtime.model, { kw: 20, stale: false, sourceHint: 'GRID' });
  const snapshot = buildMonitoringSnapshot(defaultDynamicZeroExportConfig, policy, { kw: 20, stale: false });
  assert.ok(snapshot.controllerStatus);
  assert.ok(snapshot.summary.length > 0);
});

