import type { AlarmState } from '../runtime/alarm-model';

export function summarizeAlarms(state: AlarmState): string[] {
  return state.active.map((alarm) => `${alarm.severity.toUpperCase()}: ${alarm.code} - ${alarm.message}`);
}

