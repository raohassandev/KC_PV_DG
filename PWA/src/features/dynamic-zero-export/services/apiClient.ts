import type {
  AlertResponse,
  CommissioningSummaryResponse,
  ConfigReviewResponse,
  ConnectivityResponse,
  DeviceInfoResponse,
  HistorySummaryResponse,
  LiveStatusResponse,
  SessionResponse,
  TopologyResponse,
  ApiSnapshotResponse,
} from '../../../../../dynamic_zero_export/api_contract';

export type DzxApiBaseUrl = string;

export type DzxApiClient = {
  baseUrl: string;
  getDeviceInfo(): Promise<DeviceInfoResponse>;
  getLiveStatus(): Promise<LiveStatusResponse>;
  getTopology(): Promise<TopologyResponse>;
  getConnectivity(): Promise<ConnectivityResponse>;
  getAlerts(): Promise<AlertResponse>;
  getHistory(): Promise<HistorySummaryResponse>;
  getCommissioning(): Promise<CommissioningSummaryResponse>;
  getConfigReview(): Promise<ConfigReviewResponse>;
  getSession(): Promise<SessionResponse>;
  getSnapshot(): Promise<ApiSnapshotResponse>;
  setProviderMode(mode: 'auto' | 'api' | 'mock'): Promise<SessionResponse>;
  setConnectivitySettings(body: unknown): Promise<ConnectivityResponse>;
  acknowledgeAlerts(ids: string[]): Promise<AlertResponse>;
  simulateLiveStatus(body: Partial<LiveStatusResponse>): Promise<LiveStatusResponse>;
  simulateConnectivity(body: Partial<ConnectivityResponse>): Promise<ConnectivityResponse>;
  simulateAlerts(body: unknown): Promise<AlertResponse>;
  appendHistory(body: unknown): Promise<HistorySummaryResponse>;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

async function getJson<T>(baseUrl: string, path: string): Promise<T> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function postJson<T>(baseUrl: string, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export function createDzxApiClient(baseUrl: string): DzxApiClient {
  const normalized = normalizeBaseUrl(baseUrl);
  return {
    baseUrl: normalized,
    getDeviceInfo: () => getJson<DeviceInfoResponse>(normalized, '/api/device/info'),
    getLiveStatus: () => getJson<LiveStatusResponse>(normalized, '/api/live-status'),
    getTopology: () => getJson<TopologyResponse>(normalized, '/api/topology'),
    getConnectivity: () => getJson<ConnectivityResponse>(normalized, '/api/connectivity'),
    getAlerts: () => getJson<AlertResponse>(normalized, '/api/alerts'),
    getHistory: () => getJson<HistorySummaryResponse>(normalized, '/api/history'),
    getCommissioning: () => getJson<CommissioningSummaryResponse>(normalized, '/api/commissioning'),
    getConfigReview: () => getJson<ConfigReviewResponse>(normalized, '/api/config-review'),
    getSession: () => getJson<SessionResponse>(normalized, '/api/session'),
    getSnapshot: () => getJson<ApiSnapshotResponse>(normalized, '/api/snapshot'),
    setProviderMode: (mode) => postJson<SessionResponse>(normalized, '/api/provider-mode', { mode }),
    setConnectivitySettings: (body) => postJson<ConnectivityResponse>(normalized, '/api/connectivity/settings', body),
    acknowledgeAlerts: (ids) => postJson<AlertResponse>(normalized, '/api/alerts/ack', { ids }),
    simulateLiveStatus: (body) => postJson<LiveStatusResponse>(normalized, '/api/sim/live-status', body),
    simulateConnectivity: (body) => postJson<ConnectivityResponse>(normalized, '/api/sim/connectivity', body),
    simulateAlerts: (body) => postJson<AlertResponse>(normalized, '/api/sim/alerts', body),
    appendHistory: (body) => postJson<HistorySummaryResponse>(normalized, '/api/sim/history-append', body),
  };
}
