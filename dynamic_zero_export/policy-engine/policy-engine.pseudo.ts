import {
  type DynamicZeroExportSiteConfig,
  type GeneratorConfig,
  type InverterGroupConfig,
} from '../schema/site-config.types';

export type MeterReading = {
  kw: number;
  volts?: number;
  amps?: number;
  pf?: number;
  frequencyHz?: number;
  stale: boolean;
};

export type VirtualMeterReading = {
  kw: number;
  mode: 'pass_through' | 'adjusted' | 'safe_fallback';
  notes: string[];
};

export function detectTopology(config: DynamicZeroExportSiteConfig) {
  const combined = config.topology.type === 'DUAL_BUS_COMBINED';
  const separate = config.topology.type === 'DUAL_BUS_SEPARATE';
  const dual = config.topology.type.startsWith('DUAL_BUS');

  return {
    type: config.topology.type,
    combined,
    separate,
    dual,
  };
}

export function detectSource(reading: MeterReading) {
  if (reading.stale) return 'AMBIGUOUS';
  if (reading.kw < 0) return 'GRID';
  if (reading.kw >= 0) return 'GENERATOR';
  return 'NONE';
}

export function normalizeMeter(reading: MeterReading) {
  return {
    kw: reading.kw,
    volts: reading.volts ?? null,
    amps: reading.amps ?? null,
    pf: reading.pf ?? null,
    frequencyHz: reading.frequencyHz ?? null,
    stale: reading.stale,
  };
}

export function computeVirtualMeter(
  config: DynamicZeroExportSiteConfig,
  real: MeterReading,
  generators: GeneratorConfig[],
  inverters: InverterGroupConfig[],
): VirtualMeterReading {
  if (real.stale) {
    return {
      kw: Math.max(real.kw, 0),
      mode: 'safe_fallback',
      notes: ['real meter stale'],
    };
  }

  const source = detectSource(real);
  if (source === 'GRID') {
    if (!config.policy.netMeteringEnabled || config.policy.gridMode === 'zero_export') {
      return {
        kw: Math.max(real.kw - config.policy.zeroExportDeadbandKw, 0),
        mode: 'adjusted',
        notes: ['grid zero export'],
      };
    }
    if (config.policy.gridMode === 'export_setpoint') {
      return {
        kw: config.policy.exportSetpointKw,
        mode: 'adjusted',
        notes: ['grid export setpoint'],
      };
    }
    return {
      kw: real.kw,
      mode: 'pass_through',
      notes: ['grid pass-through'],
    };
  }

  const minLoadKw = generators.reduce((sum, gen) => {
    const minPct = gen.type === 'gas'
      ? config.policy.gasMinimumLoadPct
      : config.policy.dieselMinimumLoadPct;
    return sum + (gen.ratingKw * minPct) / 100;
  }, 0);

  const adjustedKw = Math.max(real.kw - minLoadKw, 0);
  return {
    kw: adjustedKw,
    mode: 'adjusted',
    notes: ['generator minimum-load protection', 'reverse-protection assist'],
  };
}

