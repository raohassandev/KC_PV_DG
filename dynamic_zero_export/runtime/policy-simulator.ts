import { buildSiteRuntime } from './site-model';
import { evaluatePolicy, type PolicyEngineResult } from './policy-engine';
import type { DynamicZeroExportSiteConfig } from '../schema/site-config.types';
import type { RealMeterSample } from './source-detection';
import { buildMonitoringSnapshot } from '../monitoring/snapshot-builder';
import { buildCommissioningSummary } from '../commissioning/summary-builder';

export type SimulationInput = {
  config: DynamicZeroExportSiteConfig;
  realMeter: RealMeterSample;
};

export type SimulationResult = {
  policy: PolicyEngineResult;
  monitoring: ReturnType<typeof buildMonitoringSnapshot>;
  commissioning: ReturnType<typeof buildCommissioningSummary>;
};

export function simulatePolicy(input: SimulationInput): SimulationResult {
  const runtime = buildSiteRuntime(input.config);
  const policy = evaluatePolicy(runtime.model, input.realMeter);
  const monitoring = buildMonitoringSnapshot(input.config, policy, input.realMeter);
  const commissioning = buildCommissioningSummary(input.config, policy);
  return { policy, monitoring, commissioning };
}

