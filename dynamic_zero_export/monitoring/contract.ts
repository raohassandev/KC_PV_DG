import { type DynamicZeroExportSiteConfig } from '../schema/site-config.types';
import { type MonitoringState } from '../runtime/monitoring-model';
import { type AlarmRecord } from '../runtime/alarm-model';

export type PwaContract = {
  configFields: Array<string>;
  monitoringFields: Array<string>;
  alarmFields: Array<string>;
  commissioningFields: Array<string>;
};

export const dynamicZeroExportPwaContract: PwaContract = {
  configFields: [
    'site.name',
    'site.controllerId',
    'topology.type',
    'meterInput.transport',
    'meterInput.brand',
    'meterInput.profileId',
    'virtualMeter.brand',
    'virtualMeter.profileId',
    'virtualMeter.mode',
    'policy.netMeteringEnabled',
    'policy.gridMode',
    'policy.exportSetpointKw',
    'policy.zeroExportDeadbandKw',
    'policy.reverseMarginKw',
    'policy.dieselMinimumLoadPct',
    'policy.gasMinimumLoadPct',
    'policy.fastDropPct',
    'policy.rampUpPct',
    'policy.rampDownPct',
    'safety.meterTimeoutSec',
    'monitoring.enableWebUi',
    'monitoring.enableEventLog',
  ],
  monitoringFields: [
    'controllerStatus',
    'controllerOnline',
    'wifiState',
    'lanState',
    'topologyState',
    'sourceState',
    'realMeterKw',
    'virtualMeterKw',
    'generatorMarginKw',
    'policyMode',
  ],
  alarmFields: ['code', 'severity', 'message', 'timestamp'],
  commissioningFields: [
    'warnings',
    'topologySummary',
    'sourceSummary',
    'policySummary',
    'monitoringSummary',
    'readinessChecklist',
    'reviewLines',
  ],
};

export type CommissioningSummary = {
  site: DynamicZeroExportSiteConfig['site'];
  topology: DynamicZeroExportSiteConfig['topology'];
  warnings: string[];
  topologySummary: string;
  sourceSummary?: string;
  policySummary?: string;
  monitoringSummary?: string;
  readinessChecklist?: string[];
  reviewLines?: string[];
};

export type MonitoringPayload = MonitoringState;
export type AlarmPayload = AlarmRecord;
