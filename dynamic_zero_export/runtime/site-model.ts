import { type DynamicZeroExportSiteConfig } from '../schema/site-config.types';
import { createAlarmState } from './alarm-model';
import { createMonitoringState, type MonitoringState } from './monitoring-model';
import { type RuntimeSiteModel } from './policy-types';
import { createRuntimeSiteModel } from './policy-engine';
import { evaluateControllerStatus } from './status-machine';

export type SiteRuntime = {
  config: DynamicZeroExportSiteConfig;
  model: RuntimeSiteModel;
  monitoring: MonitoringState;
};

export function buildSiteRuntime(config: DynamicZeroExportSiteConfig): SiteRuntime {
  const monitoring = createMonitoringState();
  const alarms = createAlarmState();
  monitoring.controllerStatus = evaluateControllerStatus({
    online: true,
    adapterUpstream: 'warn',
    adapterDownstream: 'warn',
    alarms,
    fallbackActive: false,
  });
  return {
    config,
    model: createRuntimeSiteModel(config),
    monitoring,
  };
}
