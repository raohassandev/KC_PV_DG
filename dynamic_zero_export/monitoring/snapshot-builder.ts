import type { DynamicZeroExportSiteConfig } from '../schema/site-config.types';
import type { RealMeterSample } from '../runtime/source-detection';
import type { PolicyEngineResult } from '../runtime/policy-engine';
import { createMonitoringState, type MonitoringState } from '../runtime/monitoring-model';
import { evaluateControllerStatus } from '../runtime/status-machine';
import { summarizeAlarms } from './alarm-summary';

export type MonitoringSnapshot = MonitoringState & {
  summary: string[];
};

export function buildMonitoringSnapshot(
  config: DynamicZeroExportSiteConfig,
  policy: PolicyEngineResult,
  real: RealMeterSample,
): MonitoringSnapshot {
  const snapshot = createMonitoringState();
  snapshot.controllerOnline = true;
  snapshot.wifiState = config.monitoring.enableWebUi ? 'connected' : 'unknown';
  snapshot.lanState = config.monitoring.publishDiagnostics ? 'connected' : 'unknown';
  snapshot.topologyState = policy.topologyState.mode;
  snapshot.sourceState = policy.decision.mode === 'generator_min_load' || policy.decision.mode === 'reverse_protection'
    ? 'GENERATOR'
    : 'GRID';
  snapshot.realMeterKw = real.kw;
  snapshot.virtualMeterKw = policy.virtualMeter.kw;
  snapshot.generatorMarginKw = Math.max(
    0,
    config.generators.reduce((sum, generator) => sum + generator.ratingKw, 0) - policy.decision.targetKw,
  );
  snapshot.policyMode = policy.decision.mode;
  snapshot.alarms = policy.alarms.active;
  snapshot.warnings = [...policy.decision.notes];
  snapshot.commsFresh = !real.stale;
  snapshot.adapterHealth = {
    upstream: real.stale ? 'warn' : 'ok',
    downstream: policy.decision.mode === 'safe_fallback' ? 'warn' : 'ok',
  };
  snapshot.controllerStatus = evaluateControllerStatus({
    online: snapshot.controllerOnline,
    adapterUpstream: snapshot.adapterHealth.upstream,
    adapterDownstream: snapshot.adapterHealth.downstream,
    alarms: policy.alarms,
    fallbackActive: policy.decision.mode === 'safe_fallback',
  });
  snapshot.eventLog = summarizeAlarms(policy.alarms).map((message) => ({
    timestamp: new Date().toISOString(),
    level: 'warn' as const,
    message,
  }));

  return {
    ...snapshot,
    summary: [
      `mode: ${snapshot.policyMode}`,
      `topology: ${snapshot.topologyState}`,
      `source: ${snapshot.sourceState}`,
      `real kw: ${snapshot.realMeterKw ?? 'n/a'}`,
      `virtual kw: ${snapshot.virtualMeterKw ?? 'n/a'}`,
    ],
  };
}

