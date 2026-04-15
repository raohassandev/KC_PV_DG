import type { DynamicZeroExportSiteConfig } from '../schema/site-config.types';
import type { PolicyEngineResult } from './policy-engine';
import { buildConfigReview } from '../commissioning/config-review';

export type CommissioningSummary = {
  siteName: string;
  controllerId: string;
  topologySummary: string;
  sourceSummary: string;
  policySummary: string;
  monitoringSummary: string;
  warnings: string[];
  readinessChecklist: string[];
};

export function createCommissioningSummary(
  config: DynamicZeroExportSiteConfig,
  policy: PolicyEngineResult,
): CommissioningSummary {
  const review = buildConfigReview(config);
  return {
    siteName: config.site.name,
    controllerId: config.site.controllerId,
    topologySummary: `${config.topology.type} with ${config.topology.busCount} bus(es)`,
    sourceSummary: `${config.meterInput.transport.toUpperCase()} meter ${config.meterInput.brand}/${config.meterInput.profileId}`,
    policySummary: `${config.policy.gridMode} | net metering ${config.policy.netMeteringEnabled ? 'on' : 'off'} | fallback ${config.policy.fallbackMode} | runtime ${policy.decision.mode}`,
    monitoringSummary: `${config.monitoring.enableWebUi ? 'UI enabled' : 'UI disabled'} | diagnostics ${config.monitoring.publishDiagnostics ? 'on' : 'off'}`,
    warnings: [...review.warnings, ...policy.alarms.active.map((alarm) => alarm.message)],
    readinessChecklist: review.checklist,
  };
}

