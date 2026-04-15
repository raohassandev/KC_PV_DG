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

export function createDzxApiClient(baseUrl: string): DzxApiClient {
  const normalized = normalizeBaseUrl(baseUrl);
  return {
    baseUrl: normalized,
    getDeviceInfo: () => getJson<DeviceInfoResponse>(normalized, '/api/device'),
    getLiveStatus: () => getJson<LiveStatusResponse>(normalized, '/api/live-status'),
    getTopology: () => getJson<TopologyResponse>(normalized, '/api/topology'),
    getConnectivity: () => getJson<ConnectivityResponse>(normalized, '/api/connectivity'),
    getAlerts: () => getJson<AlertResponse>(normalized, '/api/alerts'),
    getHistory: () => getJson<HistorySummaryResponse>(normalized, '/api/history'),
    getCommissioning: () => getJson<CommissioningSummaryResponse>(normalized, '/api/commissioning'),
    getConfigReview: () => getJson<ConfigReviewResponse>(normalized, '/api/config-review'),
    getSession: () => getJson<SessionResponse>(normalized, '/api/session'),
    getSnapshot: () => getJson<ApiSnapshotResponse>(normalized, '/api/snapshot'),
  };
}
