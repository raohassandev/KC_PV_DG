import type {
  ApiSnapshotResponse,
  AlertResponse,
  CommissioningSummaryResponse,
  ConnectivityResponse,
  DeviceInfoResponse,
  HistorySummaryResponse,
  LiveStatusResponse,
  SessionResponse,
  TopologyResponse,
  ConfigReviewResponse,
} from './types';

export const deviceExample: DeviceInfoResponse = {
  deviceId: 'dzx-001',
  deviceName: 'Dynamic Zero Export Controller',
  controllerId: 'dzx-001',
  firmwareVersion: '0.1.0-dev',
  buildId: 'dev-0001',
  uptimeSec: 3600,
  localTimeIso: '2026-04-15T00:00:00Z',
};

export const liveStatusExample: LiveStatusResponse = {
  role: 'user',
  siteName: 'Demo Plant',
  controllerState: 'healthy',
  systemOnline: true,
  powerKw: 125.4,
  solarKw: 130.2,
  gridImportKw: 2.1,
  gridExportKw: 6.8,
  generatorKw: 0,
  alertsCount: 1,
  lastUpdatedAt: '2026-04-15T00:00:00Z',
  summary: ['Plant healthy', 'LAN connected', 'No active faults'],
};

export const topologyExample: TopologyResponse = {
  topologyType: 'SINGLE_BUS',
  topologyMode: 'single',
  controlZones: 1,
  dualBus: false,
  sourceState: 'GRID',
};

export const connectivityExample: ConnectivityResponse = {
  deviceName: 'Dynamic Zero Export Controller',
  controllerId: 'dzx-001',
  firmwareVersion: '0.1.0-dev',
  buildId: 'dev-0001',
  wifi: { ssid: 'Plant-WiFi', signalDbm: -51, state: 'connected', ipAddress: '192.168.0.50' },
  lan: { state: 'connected', ipAddress: '192.168.0.50' },
  reachability: { localApi: true, upstreamMeter: true, downstreamInverter: true },
  uptimeSec: 3600,
  reconnectState: 'stable',
};

export const alertsExample: AlertResponse = {
  active: [
    {
      id: 'a1',
      code: 'METER_STALE',
      severity: 'warning',
      category: 'meter',
      title: 'Meter data stale',
      userMessage: 'Meter data is delayed',
      installerMessage: 'Upstream meter stopped updating',
      debugMessage: 'poll timeout count = 3',
      timestamp: '2026-04-15T00:00:00Z',
      acknowledged: false,
    },
  ],
  recent: [
    {
      id: 'a0',
      code: 'CONFIG_LOADED',
      severity: 'info',
      category: 'commissioning',
      title: 'Configuration loaded',
      message: 'Commissioning profile loaded successfully',
      timestamp: '2026-04-15T00:00:00Z',
    },
  ],
  summary: { criticalCount: 0, warningCount: 1, infoCount: 1 },
};

export const historyExample: HistorySummaryResponse = {
  today: [
    { timestamp: '2026-04-15T08:00:00Z', solarKwh: 1.2, gridImportKwh: 0.1, gridExportKwh: 0.8, generatorKwh: 0, curtailedKwh: 0 },
    { timestamp: '2026-04-15T08:05:00Z', solarKwh: 1.4, gridImportKwh: 0.0, gridExportKwh: 1.0, generatorKwh: 0, curtailedKwh: 0.1 },
  ],
  month: [
    { timestamp: '2026-04-01T00:00:00Z', solarKwh: 120, gridImportKwh: 4, gridExportKwh: 32, generatorKwh: 0, curtailedKwh: 2 },
  ],
  lifetime: [
    { timestamp: '2026-01-01T00:00:00Z', solarKwh: 1200, gridImportKwh: 80, gridExportKwh: 320, generatorKwh: 25, curtailedKwh: 20 },
  ],
  totals: { solarKwh: 1321.6, gridImportKwh: 84.1, gridExportKwh: 353.8, generatorKwh: 25, curtailedKwh: 22.1 },
  range: 'today',
  resolution: '5m',
};

export const commissioningExample: CommissioningSummaryResponse = {
  siteName: 'Demo Plant',
  topologySummary: 'Single bus, grid-first, zero export',
  sourceSummary: ['Grid meter present', 'Inverter group present'],
  policySummary: ['Zero export', 'Deadband 1 kW'],
  monitoringSummary: ['Wi-Fi connected', 'LAN connected'],
  warnings: ['Huawei inverter write gate pending site validation'],
  readinessChecklist: ['Verify meter', 'Verify connectivity', 'Review policy'],
  reviewLines: ['Topology OK', 'Policy OK'],
};

export const configReviewExample: ConfigReviewResponse = {
  valid: true,
  warnings: ['Huawei inverter write gate pending site validation'],
  errors: [],
  reviewLines: ['Topology valid', 'Policy valid'],
};

export const sessionExample: SessionResponse = {
  role: 'user',
  siteId: 'site-001',
  locale: 'en',
  authenticated: false,
  accessMode: 'local',
};

export const snapshotExample: ApiSnapshotResponse = {
  device: deviceExample,
  live: liveStatusExample,
  topology: topologyExample,
  connectivity: connectivityExample,
  alerts: alertsExample,
  history: historyExample,
  commissioning: commissioningExample,
  configReview: configReviewExample,
  session: sessionExample,
};

