export type AlarmSeverity = 'info' | 'warning' | 'critical';

export type AlarmRecord = {
  code: string;
  severity: AlarmSeverity;
  message: string;
  timestamp: string;
};

export type AlarmState = {
  active: AlarmRecord[];
  history: AlarmRecord[];
};

export function createAlarmState(): AlarmState {
  return { active: [], history: [] };
}

export function raiseAlarm(state: AlarmState, alarm: AlarmRecord) {
  state.active.push(alarm);
  state.history.push(alarm);
}

export function clearAlarm(state: AlarmState, code: string) {
  state.active = state.active.filter((item) => item.code !== code);
}

