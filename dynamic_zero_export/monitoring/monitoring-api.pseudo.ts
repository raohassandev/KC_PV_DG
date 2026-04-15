export type MonitoringSnapshot = {
  online: boolean;
  wifiState: string;
  lanState: string;
  topologyState: string;
  realMeterKw: number | null;
  virtualMeterKw: number | null;
  inverterState: string;
  generatorMarginKw: number | null;
  warnings: string[];
  alarms: string[];
  eventLog: Array<{ ts: string; level: 'info' | 'warn' | 'alarm'; message: string }>;
};

export function buildSnapshot(): MonitoringSnapshot {
  return {
    online: true,
    wifiState: 'connected',
    lanState: 'connected',
    topologyState: 'single-bus',
    realMeterKw: null,
    virtualMeterKw: null,
    inverterState: 'unknown',
    generatorMarginKw: null,
    warnings: [],
    alarms: [],
    eventLog: [],
  };
}

