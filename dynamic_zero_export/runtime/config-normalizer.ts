import {
  defaultDynamicZeroExportConfig,
  type DynamicZeroExportSiteConfig,
} from '../schema/site-config.types';

export type NormalizedConfigResult = {
  config: DynamicZeroExportSiteConfig;
  warnings: string[];
};

export function normalizeSiteConfig(
  raw: Partial<DynamicZeroExportSiteConfig> | unknown,
): NormalizedConfigResult {
  const warnings: string[] = [];
  if (typeof raw !== 'object' || raw === null) {
    return { config: defaultDynamicZeroExportConfig, warnings: ['Using default configuration'] };
  }

  const input = raw as Partial<DynamicZeroExportSiteConfig>;
  const addressing =
    input.meterInput && typeof input.meterInput.addressing === 'object' && input.meterInput.addressing !== null
      ? (input.meterInput.addressing as Record<string, unknown>)
      : {};
  const config: DynamicZeroExportSiteConfig = {
    ...defaultDynamicZeroExportConfig,
    ...input,
    site: { ...defaultDynamicZeroExportConfig.site, ...(input.site || {}) },
    topology: { ...defaultDynamicZeroExportConfig.topology, ...(input.topology || {}) },
    meterInput: {
      ...defaultDynamicZeroExportConfig.meterInput,
      ...(input.meterInput || {}),
      addressing: {
        ...defaultDynamicZeroExportConfig.meterInput.addressing,
        ...addressing,
      } as DynamicZeroExportSiteConfig['meterInput']['addressing'],
    },
    virtualMeter: {
      ...defaultDynamicZeroExportConfig.virtualMeter,
      ...(input.virtualMeter || {}),
    },
    policy: { ...defaultDynamicZeroExportConfig.policy, ...(input.policy || {}) },
    safety: { ...defaultDynamicZeroExportConfig.safety, ...(input.safety || {}) },
    monitoring: {
      ...defaultDynamicZeroExportConfig.monitoring,
      ...(input.monitoring || {}),
    },
    generators: input.generators || defaultDynamicZeroExportConfig.generators,
    inverterGroups: input.inverterGroups || defaultDynamicZeroExportConfig.inverterGroups,
  };

  if (!config.site.notes) warnings.push('site.notes is empty');
  return { config, warnings };
}
