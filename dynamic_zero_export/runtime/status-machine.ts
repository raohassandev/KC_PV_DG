import type { AlarmState } from './alarm-model';

export type ControllerStatus = 'DISABLED' | 'STARTING' | 'HEALTHY' | 'DEGRADED' | 'FALLBACK' | 'FAULTED';

export type StatusInput = {
  online: boolean;
  adapterUpstream: 'ok' | 'warn' | 'fail';
  adapterDownstream: 'ok' | 'warn' | 'fail';
  alarms: AlarmState;
  fallbackActive: boolean;
};

export function evaluateControllerStatus(input: StatusInput): ControllerStatus {
  if (!input.online) return 'DISABLED';
  if (input.adapterUpstream === 'fail' || input.adapterDownstream === 'fail') return 'FAULTED';
  if (input.fallbackActive) return 'FALLBACK';
  if (input.alarms.active.some((alarm) => alarm.severity === 'critical')) return 'FAULTED';
  if (input.alarms.active.length > 0 || input.adapterUpstream === 'warn' || input.adapterDownstream === 'warn') {
    return 'DEGRADED';
  }
  return 'HEALTHY';
}

