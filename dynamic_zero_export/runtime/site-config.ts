import {
  defaultDynamicZeroExportConfig,
  type DynamicZeroExportSiteConfig,
} from '../schema/site-config.types';
import { normalizeSiteConfig } from './config-normalizer';
import { validateNormalizedConfig } from './config-validator';

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function loadSiteConfig(raw: unknown): DynamicZeroExportSiteConfig {
  return normalizeSiteConfig(raw).config;
}

export function validateSiteConfig(
  config: DynamicZeroExportSiteConfig,
): ValidationResult {
  return validateNormalizedConfig(config);
}

export function loadAndValidateSiteConfig(raw: unknown): {
  config: DynamicZeroExportSiteConfig;
  validation: ValidationResult;
  warnings: string[];
} {
  const normalized = normalizeSiteConfig(raw);
  const validation = validateNormalizedConfig(normalized.config);
  return {
    config: normalized.config,
    validation,
    warnings: [...normalized.warnings, ...validation.warnings],
  };
}

export { defaultDynamicZeroExportConfig };
