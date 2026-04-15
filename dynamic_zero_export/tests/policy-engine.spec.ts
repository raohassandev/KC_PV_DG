import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDynamicZeroExportConfig } from '../schema/site-config.types';
import { buildSiteRuntime } from '../runtime/site-model';
import { evaluatePolicy } from '../runtime/policy-engine';
import { deriveTopology } from '../runtime/topology';

test('zero export clamps positive real meter power', () => {
  const config = {
    ...defaultDynamicZeroExportConfig,
    policy: { ...defaultDynamicZeroExportConfig.policy, netMeteringEnabled: false, gridMode: 'zero_export' },
  };
  const runtime = buildSiteRuntime(config);
  const result = evaluatePolicy(runtime.model, { kw: 12, stale: false, sourceHint: 'GRID' });
  assert.equal(result.decision.mode, 'zero_export');
  assert.ok(result.decision.targetKw >= 0);
});

test('limited export uses configured setpoint', () => {
  const config = {
    ...defaultDynamicZeroExportConfig,
    policy: { ...defaultDynamicZeroExportConfig.policy, gridMode: 'export_setpoint', exportSetpointKw: 42 },
  };
  const runtime = buildSiteRuntime(config);
  const result = evaluatePolicy(runtime.model, { kw: 120, stale: false, sourceHint: 'GRID' });
  assert.equal(result.decision.mode, 'limited_export');
  assert.equal(result.decision.targetKw, 42);
});

test('generator minimum-load mode reduces virtual meter', () => {
  const config = {
    ...defaultDynamicZeroExportConfig,
    policy: { ...defaultDynamicZeroExportConfig.policy, netMeteringEnabled: true, gridMode: 'export_setpoint' },
  };
  const runtime = buildSiteRuntime(config);
  const result = evaluatePolicy(runtime.model, { kw: 200, stale: false, sourceHint: 'GENERATOR' });
  assert.equal(result.decision.mode, 'generator_min_load');
  assert.ok(result.decision.targetKw <= 200);
});

test('stale data enters safe fallback', () => {
  const runtime = buildSiteRuntime(defaultDynamicZeroExportConfig);
  const result = evaluatePolicy(runtime.model, { kw: 50, stale: true });
  assert.equal(result.decision.mode, 'safe_fallback');
  assert.equal(result.decision.targetKw, 0);
});

test('reverse protection assist changes mode', () => {
  const config = {
    ...defaultDynamicZeroExportConfig,
    policy: { ...defaultDynamicZeroExportConfig.policy, reverseMarginKw: 500 },
  };
  const runtime = buildSiteRuntime(config);
  const result = evaluatePolicy(runtime.model, { kw: 100, stale: false, sourceHint: 'GENERATOR' });
  assert.equal(result.decision.mode, 'reverse_protection');
  assert.ok(result.decision.notes.some((note) => note.includes('reverse protection')));
});

test('dual bus combined derives one zone', () => {
  const config = {
    ...defaultDynamicZeroExportConfig,
    topology: { type: 'DUAL_BUS_COMBINED', busCount: 2, tieSignalPresent: true },
  };
  const topology = deriveTopology(config);
  assert.equal(topology.mode, 'dual-combined');
  assert.equal(topology.zones.length, 1);
});

test('dual bus separate derives two zones', () => {
  const config = {
    ...defaultDynamicZeroExportConfig,
    topology: { type: 'DUAL_BUS_SEPARATE', busCount: 2, tieSignalPresent: true },
  };
  const topology = deriveTopology(config);
  assert.equal(topology.mode, 'dual-separate');
  assert.equal(topology.zones.length, 2);
});

test('source ambiguity enters safe fallback', () => {
  const runtime = buildSiteRuntime(defaultDynamicZeroExportConfig);
  const result = evaluatePolicy(runtime.model, { kw: 0, stale: false });
  assert.equal(result.decision.mode, 'safe_fallback');
  assert.ok(result.alarms.active.some((alarm) => alarm.code === 'AMBIGUOUS_SOURCE'));
});
