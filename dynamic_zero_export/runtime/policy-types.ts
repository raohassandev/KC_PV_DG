import { type DynamicZeroExportSiteConfig } from '../schema/site-config.types';
import { type VirtualMeterState } from './virtual-meter';

export type RuntimePolicyMode =
  | 'pass_through'
  | 'zero_export'
  | 'limited_export'
  | 'generator_min_load'
  | 'reverse_protection'
  | 'safe_fallback';

export type PolicyDecision = {
  mode: RuntimePolicyMode;
  targetKw: number;
  clampPct: number;
  notes: string[];
};

export type RuntimeSiteModel = {
  config: DynamicZeroExportSiteConfig;
  policyMode: RuntimePolicyMode;
  lastDecision?: PolicyDecision;
  lastVirtualMeter?: VirtualMeterState;
};

