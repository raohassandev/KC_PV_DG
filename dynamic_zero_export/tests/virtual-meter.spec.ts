import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultDynamicZeroExportConfig, type DynamicZeroExportSiteConfig } from '../schema/site-config.types';
import { computeVirtualMeterState } from '../runtime/virtual-meter';

test('virtual meter zero export reduces positive grid power', () => {
  const config: DynamicZeroExportSiteConfig = {
    ...defaultDynamicZeroExportConfig,
    policy: { ...defaultDynamicZeroExportConfig.policy, netMeteringEnabled: false, gridMode: 'zero_export' },
    generators: [],
  };
  const state = computeVirtualMeterState(config, { kw: 12, stale: false, sourceHint: 'GRID' });
  assert.equal(state.mode, 'adjusted');
  assert.ok(state.kw >= 0);
  assert.ok(state.notes.some((note) => note.includes('zero export')));
});

test('virtual meter pass-through stays unchanged', () => {
  const config: DynamicZeroExportSiteConfig = {
    ...defaultDynamicZeroExportConfig,
    virtualMeter: { ...defaultDynamicZeroExportConfig.virtualMeter, mode: 'pass_through' },
  };
  const state = computeVirtualMeterState(config, { kw: 33, stale: false, sourceHint: 'GRID' });
  assert.equal(state.mode, 'pass_through');
  assert.equal(state.kw, 33);
});
