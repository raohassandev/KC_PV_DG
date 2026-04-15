import { type AlarmRecord } from './alarm-model';

export type MonitoringState = {
  controllerStatus: 'DISABLED' | 'STARTING' | 'HEALTHY' | 'DEGRADED' | 'FALLBACK' | 'FAULTED';
  controllerOnline: boolean;
  wifiState: 'connected' | 'disconnected' | 'unknown';
  lanState: 'connected' | 'disconnected' | 'unknown';
  topologyState: string;
  sourceState: string;
  realMeterKw: number | null;
  virtualMeterKw: number | null;
  generatorMarginKw: number | null;
  policyMode: string;
  warnings: string[];
  alarms: AlarmRecord[];
  commsFresh: boolean;
  adapterHealth: {
    upstream: 'ok' | 'warn' | 'fail';
    downstream: 'ok' | 'warn' | 'fail';
  };
  eventLog: Array<{ timestamp: string; level: 'info' | 'warn' | 'alarm'; message: string }>;
};

export function createMonitoringState(): MonitoringState {
  return {
    controllerStatus: 'DISABLED',
    controllerOnline: false,
    wifiState: 'unknown',
    lanState: 'unknown',
    topologyState: 'unknown',
    sourceState: 'unknown',
    realMeterKw: null,
    virtualMeterKw: null,
    generatorMarginKw: null,
    policyMode: 'unknown',
    warnings: [],
    alarms: [],
    commsFresh: false,
    adapterHealth: { upstream: 'warn', downstream: 'warn' },
    eventLog: [],
  };
}
