import { type DynamicZeroExportSiteConfig, type VirtualMeterMode } from '../schema/site-config.types';
import { type RealMeterSample } from './source-detection';
import { generatorMinimumLoadKw } from './source-detection';
import { deriveTopology } from './topology';

export type VirtualMeterState = {
  kw: number;
  mode: VirtualMeterMode;
  notes: string[];
};

export function computeVirtualMeterState(
  config: DynamicZeroExportSiteConfig,
  real: RealMeterSample,
): VirtualMeterState {
  const topology = deriveTopology(config);
  const minLoadKw = generatorMinimumLoadKw(config, config.generators);

  if (real.stale) {
    return { kw: 0, mode: 'safe_fallback', notes: ['stale real meter data'] };
  }

  if (config.virtualMeter.mode === 'pass_through') {
    return { kw: real.kw, mode: 'pass_through', notes: ['pass-through mode'] };
  }

  if (real.kw > 0) {
    return {
      kw: Math.max(real.kw - minLoadKw, 0),
      mode: 'adjusted',
      notes: [
        `generator minimum-load protection (${topology.mode})`,
        `minimum load ${minLoadKw.toFixed(2)} kW`,
        'reverse protection assist',
      ],
    };
  }

  if (!config.policy.netMeteringEnabled || config.policy.gridMode === 'zero_export') {
    const adjustment = Math.max(real.kw - config.policy.zeroExportDeadbandKw, 0);
    return {
      kw: adjustment,
      mode: 'adjusted',
      notes: [`zero export policy (${topology.mode})`, `deadband ${config.policy.zeroExportDeadbandKw} kW`],
    };
  }

  if (config.policy.gridMode === 'export_setpoint') {
    return {
      kw: config.policy.exportSetpointKw,
      mode: 'adjusted',
      notes: ['export setpoint policy'],
    };
  }

  return {
    kw: Math.max(real.kw - minLoadKw, 0),
    mode: 'adjusted',
    notes: [
      `generator minimum-load protection (${topology.mode})`,
      `minimum load ${minLoadKw.toFixed(2)} kW`,
      'reverse protection assist',
    ],
  };
}
