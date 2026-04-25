export type ApiRole = 'user' | 'installer' | 'manufacturer';

export type DeviceInfoResponse = {
  deviceId: string;
  deviceName: string;
  controllerId: string;
  firmwareVersion: string;
  buildId: string;
  uptimeSec: number;
  localTimeIso: string;
};

export type LiveStatusResponse = {
  role: ApiRole;
  siteName: string;
  controllerState: 'healthy' | 'degraded' | 'fallback' | 'faulted';
  systemOnline: boolean;
  powerKw: number;
  solarKw: number;
  gridImportKw: number;
  gridExportKw: number;
  generatorKw?: number;
  alertsCount: number;
  lastUpdatedAt: string;
  summary: string[];
};

export type TopologyResponse = {
  topologyType: string;
  topologyMode: string;
  controlZones: number;
  dualBus: boolean;
  sourceState: 'GRID' | 'GENERATOR' | 'NONE' | 'AMBIGUOUS';
};

export type ConnectivityResponse = {
  deviceName: string;
  controllerId: string;
  firmwareVersion: string;
  buildId: string;
  wifi: {
    ssid?: string;
    signalDbm?: number;
    state: 'connected' | 'disconnected' | 'connecting' | 'ap-mode';
    ipAddress?: string;
  };
  lan: {
    state: 'connected' | 'disconnected' | 'unknown';
    ipAddress?: string;
  };
  reachability: {
    localApi: boolean;
    upstreamMeter: boolean;
    downstreamInverter: boolean;
  };
  uptimeSec: number;
  reconnectState: 'stable' | 'retrying' | 'offline';
};

export type AlertResponse = {
  active: Array<{
    id: string;
    code: string;
    severity: 'info' | 'warning' | 'critical';
    category: string;
    title: string;
    userMessage: string;
    installerMessage?: string;
    debugMessage?: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
  recent: Array<{
    id: string;
    code: string;
    severity: 'info' | 'warning' | 'critical';
    category: string;
    title: string;
    message: string;
    timestamp: string;
  }>;
  summary: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
};

export type HistoryRange = 'today' | 'month' | 'year' | 'decade';
export type HistoryResolution = '5m' | 'hour' | 'day' | 'month' | 'year';

export type HistoryPoint = {
  timestamp: string;
  solarKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  generatorKwh: number;
  curtailedKwh: number;
};

export type HistorySummaryResponse = {
  /** Hourly buckets for one day (24 points). */
  today: HistoryPoint[];
  /** Daily buckets for one month (~30 points). */
  month: HistoryPoint[];
  /** Monthly buckets for one trailing year (12 points). */
  year: HistoryPoint[];
  /** Yearly buckets for the last ten years (10 points). */
  decade: HistoryPoint[];
  totals: {
    solarKwh: number;
    gridImportKwh: number;
    gridExportKwh: number;
    generatorKwh: number;
    curtailedKwh: number;
  };
  range: HistoryRange;
  resolution: HistoryResolution;
};

export type CommissioningSummaryResponse = {
  siteName: string;
  topologySummary: string;
  sourceSummary: string[];
  policySummary: string[];
  monitoringSummary: string[];
  warnings: string[];
  readinessChecklist: string[];
  reviewLines: string[];
};

export type ConfigReviewResponse = {
  valid: boolean;
  warnings: string[];
  errors: string[];
  reviewLines: string[];
};

export type SessionResponse = {
  role: ApiRole;
  siteId: string;
  locale: string;
  authenticated: boolean;
  accessMode: 'local' | 'remote';
};

export type ApiSnapshotResponse = {
  device: DeviceInfoResponse;
  live: LiveStatusResponse;
  topology: TopologyResponse;
  connectivity: ConnectivityResponse;
  alerts: AlertResponse;
  history: HistorySummaryResponse;
  commissioning: CommissioningSummaryResponse;
  configReview: ConfigReviewResponse;
  session: SessionResponse;
};

// --- Onboarding / identity (MVP) ---

export type WhoamiResponse = {
  deviceName: string;
  controllerId: string;
  mac?: string;
  ip?: string;
  fwVersion: string;
  capabilities: {
    discovery: boolean;
    apProvisioning: boolean;
    syncMode: boolean;
    dzxMode: boolean;
    modbusRtu: boolean;
    modbusTcp: boolean;
  };
  webUiUrl?: string;
};

export type ProvisionWifiRequest = {
  ssid: string;
  password: string;
};

export type ProvisionWifiResponse = {
  accepted: boolean;
  jobId: string;
};

export type ProvisionStatusResponse = {
  jobId: string;
  state: 'idle' | 'connecting' | 'connected' | 'failed';
  message?: string;
};

