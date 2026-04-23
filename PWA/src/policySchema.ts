import { inverterDeviceHasBundledYaml, meterDeviceHasBundledYaml } from './deviceFirmware';
import { type SiteConfig } from './siteProfileSchema';

export type TopologyType =
  | 'SINGLE_BUS'
  | 'SINGLE_BUS_MULTI_GEN'
  | 'DUAL_BUS'
  | 'DUAL_BUS_SEPARATE'
  | 'DUAL_BUS_COMBINED';

export type GridOperatingMode = 'full_production' | 'export_setpoint' | 'zero_export';

export type FallbackMode = 'hold_last_safe' | 'reduce_to_safe_min' | 'manual_bypass';

export type DerivedZone = {
  id: string;
  summary: string;
};

export type CommissioningSnapshot = {
  profileName: string;
  config: SiteConfig;
  zones: DerivedZone[];
  warnings: string[];
  topologySummary: string;
};

function dualBusState(config: SiteConfig) {
  const sides = new Set(
    config.slots
      .filter((slot) => slot.enabled)
      .map((slot) => slot.busSide || 'A'),
  );
  const hasA = sides.has('A');
  const hasB = sides.has('B');
  const combined = config.topologyType === 'DUAL_BUS_COMBINED';

  if (combined) return 'combined';
  if (config.topologyType === 'DUAL_BUS_SEPARATE') return 'separate';
  if (hasA && hasB) return 'derived-both';
  if (hasA && !hasB) return 'derived-a-only';
  if (!hasA && hasB) return 'derived-b-only';
  return 'ambiguous';
}

export function deriveZones(config: SiteConfig): DerivedZone[] {
  const inverterGroups = config.slots.filter(
    (slot) => slot.enabled && slot.role === 'inverter',
  );
  const generatorSlots = config.slots.filter(
    (slot) => slot.enabled && slot.role === 'generator_meter',
  );
  const gridSlots = config.slots.filter(
    (slot) => slot.enabled && slot.role === 'grid_meter',
  );

  if (config.topologyType === 'DUAL_BUS_COMBINED') {
    return [
      {
        id: 'combined',
        summary: `Combined zone: ${gridSlots.length} grid meters, ${generatorSlots.length} generators, ${inverterGroups.length} inverter groups`,
      },
    ];
  }

  if (config.topologyType.startsWith('DUAL_BUS')) {
    return [
      {
        id: 'bus_a',
        summary: `Bus A zone: ${Math.ceil(gridSlots.length / 2)} grid meters, ${inverterGroups.length ? 1 : 0} inverter group(s)`,
      },
      {
        id: 'bus_b',
        summary: `Bus B zone: remaining mapped devices, combined state depends on tie signal`,
      },
    ];
  }

  return [
    {
      id: 'site',
      summary: `Single zone: ${gridSlots.length} grid meter(s), ${generatorSlots.length} generator meter(s), ${inverterGroups.length} inverter group(s)`,
    },
  ];
}

export function policyWarnings(config: SiteConfig) {
  const enabledCounts = {
    grids: config.slots.filter((s) => s.enabled && s.role === 'grid_meter').length,
    gens: config.slots.filter((s) => s.enabled && s.role === 'generator_meter').length,
    inverters: config.slots.filter((s) => s.enabled && s.role === 'inverter').length,
  };
  const generatorTypes = config.slots
    .filter((s) => s.enabled && s.role === 'generator_meter')
    .map((s) => s.generatorType || 'diesel');
  const busSides = config.slots
    .filter((s) => s.enabled && s.role !== 'none')
    .map((s) => s.busSide || 'A');
  const networkIds = config.slots
    .filter((s) => s.enabled)
    .map((s) => s.networkId || 'main');
  const inverterNetworks = new Set(
    config.slots
      .filter((s) => s.enabled && s.role === 'inverter')
      .map((s) => s.networkId || 'main'),
  );
  const generatorRatings = config.slots
    .filter((s) => s.enabled && s.role === 'generator_meter')
    .map((s) => s.capacityKw);

  const warnings: string[] = [];

  if (config.topologyType.startsWith('DUAL_BUS') && !config.tieSignalPresent) {
    warnings.push('Dual-bus site has no tie signal declared');
  }
  if (enabledCounts.grids === 0) warnings.push('No grid meter enabled');
  if (enabledCounts.inverters === 0) warnings.push('No inverter group enabled');
  if (enabledCounts.gens > 0 && config.gridOperatingMode === 'full_production') {
    warnings.push('Generator site should verify minimum-load behavior');
  }
  if (
    config.gridOperatingMode === 'zero_export' &&
    !config.netMeteringEnabled
  ) {
    warnings.push('Zero-export mode is active while net metering is off');
  }
  if (enabledCounts.gens > 1 && !config.generatorMinimumOverrideEnabled) {
    warnings.push('Multiple generators are configured without override approval');
  }
  if (generatorTypes.includes('gas') && config.dieselMinimumLoadPct < 30) {
    warnings.push('Diesel minimum load is below the default safe starting point');
  }
  if (config.topologyType.startsWith('DUAL_BUS') && busSides.every((side) => side === 'A')) {
    warnings.push('Dual-bus site maps all sources to bus A; bus B remains unmapped');
  }
  if (networkIds.length > 0 && new Set(networkIds).size > 2) {
    warnings.push('More than two logical network IDs are present; validate topology');
  }
  if (inverterNetworks.size > 1 && !config.topologyType.startsWith('DUAL_BUS')) {
    warnings.push('Multiple inverter networks configured on a non-dual-bus site');
  }
  if (generatorRatings.some((kw) => kw <= 0) && enabledCounts.gens > 0) {
    warnings.push('A generator meter has no positive rating');
  }
  if (config.topologyType.startsWith('DUAL_BUS') && dualBusState(config) === 'ambiguous') {
    warnings.push('Dual-bus topology is ambiguous from the current mapping');
  }

  for (const slot of config.slots) {
    if (!slot.enabled || slot.deviceType === 'none') continue;
    if (
      (slot.role === 'grid_meter' || slot.role === 'generator_meter') &&
      !meterDeviceHasBundledYaml(slot.deviceType)
    ) {
      warnings.push(
        `Slot ${slot.id}: energy analyzer / meter type "${slot.deviceType}" is catalogued but has no matching Modular_Yaml meter package in this bundle (still using EM500 include at root unless you change packages manually).`,
      );
    }
    if (slot.role === 'inverter' && !inverterDeviceHasBundledYaml(slot.deviceType)) {
      warnings.push(
        `Slot ${slot.id}: inverter type "${slot.deviceType}" is catalogued but only Huawei-family YAML is bundled today — add inverter_*.yaml before flash or switch device type for lab.`,
      );
    }
  }

  return warnings;
}

export function saveProfile(profileName: string, config: SiteConfig) {
  localStorage.setItem(`pvdg.profile.${profileName}`, JSON.stringify(config));
}

export function loadProfile(profileName: string): SiteConfig | null {
  const raw = localStorage.getItem(`pvdg.profile.${profileName}`);
  if (!raw) return null;
  return JSON.parse(raw) as SiteConfig;
}

export function snapshotCommissioning(
  profileName: string,
  config: SiteConfig,
): CommissioningSnapshot {
  return {
    profileName,
    config,
    zones: deriveZones(config),
    warnings: policyWarnings(config),
    topologySummary: dualBusState(config),
  };
}
