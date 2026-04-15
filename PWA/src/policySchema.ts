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
};

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
  };
}
