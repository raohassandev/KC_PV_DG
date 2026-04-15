import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDynamicZeroExportConfig } from '../schema/site-config.types';
import { buildSiteRuntime } from '../runtime/site-model';
import { evaluatePolicy } from '../runtime/policy-engine';
import { buildCommissioningSummary } from '../commissioning/summary-builder';

test('commissioning summary includes topology and warnings', () => {
  const runtime = buildSiteRuntime(defaultDynamicZeroExportConfig);
  const policy = evaluatePolicy(runtime.model, { kw: 20, stale: false, sourceHint: 'GRID' });
  const summary = buildCommissioningSummary(defaultDynamicZeroExportConfig, policy);
  assert.ok(summary.topologySummary.length > 0);
  assert.ok(Array.isArray(summary.readinessChecklist));
  assert.ok(Array.isArray(summary.reviewLines));
});

