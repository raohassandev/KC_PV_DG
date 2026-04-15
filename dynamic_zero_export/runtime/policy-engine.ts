import { type DynamicZeroExportSiteConfig } from '../schema/site-config.types';
import { createAlarmState, raiseAlarm, type AlarmState } from './alarm-model';
import { deriveTopology } from './topology';
import { detectSource, generatorMinimumLoadKw, type RealMeterSample } from './source-detection';
import { computeVirtualMeterState, type VirtualMeterState } from './virtual-meter';
import { type PolicyDecision, type RuntimePolicyMode, type RuntimeSiteModel } from './policy-types';

export type PolicyEngineResult = {
  decision: PolicyDecision;
  virtualMeter: VirtualMeterState;
  alarms: AlarmState;
  topologyState: ReturnType<typeof deriveTopology>;
};

export function createRuntimeSiteModel(config: DynamicZeroExportSiteConfig): RuntimeSiteModel {
  return { config, policyMode: 'pass_through' };
}

export function evaluatePolicy(
  model: RuntimeSiteModel,
  real: RealMeterSample,
): PolicyEngineResult {
  const alarms = createAlarmState();
  const topologyState = deriveTopology(model.config);
  const source = detectSource(real);
  const virtualMeter = computeVirtualMeterState(model.config, real);
  const generators = model.config.generators;
  const dualBus = topologyState.type.startsWith('DUAL_BUS');

  let policyMode: RuntimePolicyMode = 'pass_through';
  let targetKw = real.kw;
  const notes: string[] = [];

  if (topologyState.mode === 'dual-combined') {
    notes.push('dual-bus combined zone');
  } else if (topologyState.mode === 'dual-separate') {
    notes.push('dual-bus separate zones');
  }

  if (real.stale) {
    policyMode = 'safe_fallback';
    targetKw = 0;
    notes.push('stale data fallback');
    raiseAlarm(alarms, {
      code: 'STALE_DATA',
      severity: 'warning',
      message: 'Upstream meter data is stale',
      timestamp: new Date().toISOString(),
    });
  } else if (source === 'GRID') {
    if (model.config.virtualMeter.mode === 'pass_through') {
      policyMode = 'pass_through';
      targetKw = real.kw;
      notes.push('pass-through meter mode');
    } else if (
      !model.config.policy.netMeteringEnabled ||
      model.config.policy.gridMode === 'zero_export'
    ) {
      policyMode = 'zero_export';
      targetKw = Math.max(real.kw - model.config.policy.zeroExportDeadbandKw, 0);
      notes.push('zero export mode');
    } else if (model.config.policy.gridMode === 'export_setpoint') {
      policyMode = 'limited_export';
      targetKw = model.config.policy.exportSetpointKw;
      notes.push('export setpoint mode');
    } else {
      policyMode = 'pass_through';
      targetKw = real.kw;
      notes.push('full production mode');
    }
  } else if (source === 'GENERATOR') {
    const minLoadKw = generatorMinimumLoadKw(model.config, model.config.generators);
    policyMode = 'generator_min_load';
    targetKw = Math.max(real.kw - minLoadKw, 0);
    notes.push(`minimum generator load ${minLoadKw.toFixed(2)} kW`);
    if (real.kw < minLoadKw + model.config.policy.reverseMarginKw) {
      notes.push('reverse protection assist');
      policyMode = 'reverse_protection';
      raiseAlarm(alarms, {
        code: 'GENERATOR_LOW_LOAD',
        severity: 'warning',
        message: 'Generator load is near the reverse-protection margin',
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    policyMode = 'safe_fallback';
    targetKw = 0;
    notes.push('ambiguous or no source');
    raiseAlarm(alarms, {
      code: 'AMBIGUOUS_SOURCE',
      severity: 'critical',
      message: 'Unable to determine active source',
      timestamp: new Date().toISOString(),
      });
  }

  if (dualBus && topologyState.mode === 'ambiguous') {
    raiseAlarm(alarms, {
      code: 'DUAL_BUS_AMBIGUOUS',
      severity: 'critical',
      message: 'Dual-bus mapping is ambiguous',
      timestamp: new Date().toISOString(),
    });
    notes.push('dual-bus ambiguous fallback');
    policyMode = 'safe_fallback';
    targetKw = 0;
  }

  if (generators.length > 1) {
    const invalidRatings = generators.filter((gen) => gen.ratingKw <= 0).length;
    if (invalidRatings > 0) {
      raiseAlarm(alarms, {
        code: 'GENERATOR_RATING_INVALID',
        severity: 'warning',
        message: 'One or more generators have invalid ratings',
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (policyMode === 'safe_fallback') {
    virtualMeter.kw = 0;
    virtualMeter.mode = 'safe_fallback';
    virtualMeter.notes = [...virtualMeter.notes, 'safe fallback virtual meter output'];
  }

  const maxKw = Math.max(
    model.config.policy.exportSetpointKw,
    model.config.generators.reduce((sum, gen) => sum + gen.ratingKw, 0),
    1,
  );
  const clampPct = Math.max(0, Math.min(100, (targetKw / maxKw) * 100));
  const decision: PolicyDecision = { mode: policyMode, targetKw, clampPct, notes };
  model.policyMode = policyMode;
  model.lastDecision = decision;
  model.lastVirtualMeter = virtualMeter;

  return { decision, virtualMeter, alarms, topologyState };
}
