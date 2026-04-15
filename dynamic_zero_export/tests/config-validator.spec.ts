import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadSiteConfig } from '../runtime/site-config';
import { validateNormalizedConfig } from '../runtime/config-validator';

test('valid config passes validation', () => {
  const raw = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'dynamic_zero_export/examples/site-single-grid-gen.json'), 'utf8'),
  );
  const config = loadSiteConfig(raw);
  const result = validateNormalizedConfig(config);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('bad config fails validation', () => {
  const config = loadSiteConfig({
    site: { name: '', controllerId: '' },
    topology: { type: 'DUAL_BUS', busCount: 1, tieSignalPresent: false },
    meterInput: { transport: 'rtu', brand: 'generic-modbus', profileId: 'x', addressing: {} },
    virtualMeter: { brand: '', profileId: '', mode: 'adjusted', slaveId: 0 },
    policy: {
      netMeteringEnabled: true,
      gridMode: 'export_setpoint',
      exportSetpointKw: -1,
      zeroExportDeadbandKw: -1,
      dieselMinimumLoadPct: 120,
      gasMinimumLoadPct: -1,
      reverseMarginKw: -1,
      rampUpPct: 101,
      rampDownPct: 101,
      fastDropPct: 101,
      fallbackMode: 'reduce_to_safe_min',
    },
    safety: { meterTimeoutSec: 0, staleDataMode: 'reduce', manualOverrideEnabled: false },
    monitoring: { enableWebUi: true, enableEventLog: true, publishDiagnostics: true },
    generators: [{ id: 'g1', label: 'g1', type: 'diesel', ratingKw: 0 }],
    inverterGroups: [{ id: 'i1', label: 'i1', brand: '', emulationProfileId: '', slaveId: 0 }],
  } as never);
  const result = validateNormalizedConfig(config);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

