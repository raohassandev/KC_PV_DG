import type { DynamicZeroExportSiteConfig } from '../schema/site-config.types';
import { validateNormalizedConfig } from '../runtime/config-validator';
import { deriveTopology } from '../runtime/topology';

export type ConfigReview = {
  warnings: string[];
  checklist: string[];
  summaryLines: string[];
};

export function buildConfigReview(config: DynamicZeroExportSiteConfig): ConfigReview {
  const validation = validateNormalizedConfig(config);
  const topology = deriveTopology(config);
  const checklist = [
    'Verify upstream meter source',
    'Verify inverter-facing profile',
    'Verify tie/breaker input if dual-bus',
    'Verify generator type and minimum load',
    'Verify fallback behavior',
  ];
  return {
    warnings: [...validation.errors, ...validation.warnings],
    checklist,
    summaryLines: [
      `topology=${topology.mode}`,
      `meter=${config.meterInput.transport}:${config.meterInput.brand}`,
      `virtual=${config.virtualMeter.brand}:${config.virtualMeter.profileId}`,
    ],
  };
}

