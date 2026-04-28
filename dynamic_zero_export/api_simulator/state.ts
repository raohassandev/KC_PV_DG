import type {
  AlertResponse,
  ApiSnapshotResponse,
  CommissioningSummaryResponse,
  ConnectivityResponse,
  DeviceInfoResponse,
  HistorySummaryResponse,
  LiveStatusResponse,
  SessionResponse,
  TopologyResponse,
} from '../api_contract';
import { buildSnapshot } from './fixtures';

export type DeviceServiceState = ApiSnapshotResponse;

export function createDefaultState(): DeviceServiceState {
  return buildSnapshot();
}

export function cloneState(state: DeviceServiceState): DeviceServiceState {
  return JSON.parse(JSON.stringify(state)) as DeviceServiceState;
}

export function updateConnectivitySettings(
  state: DeviceServiceState,
  patch: Partial<ConnectivityResponse> & {
    wifi?: Partial<ConnectivityResponse['wifi']>;
    lan?: Partial<ConnectivityResponse['lan']>;
  },
): DeviceServiceState {
  const next = cloneState(state);
  next.connectivity = {
    ...next.connectivity,
    ...patch,
    wifi: { ...next.connectivity.wifi, ...patch.wifi },
    lan: { ...next.connectivity.lan, ...patch.lan },
  };
  return next;
}

export function updateProviderMode(state: DeviceServiceState, mode: 'auto' | 'api'): DeviceServiceState {
  const next = cloneState(state);
  next.session = {
    ...next.session,
    accessMode: mode === 'api' ? 'remote' : 'local',
    authenticated: true,
  };
  return next;
}

export function acknowledgeAlerts(state: DeviceServiceState, ids: string[]): DeviceServiceState {
  const next = cloneState(state);
  next.alerts.active = next.alerts.active.map((alert) =>
    ids.includes(alert.id) ? { ...alert, acknowledged: true } : alert,
  );
  return next;
}

export function setLiveStatus(state: DeviceServiceState, live: Partial<LiveStatusResponse>): DeviceServiceState {
  const next = cloneState(state);
  next.live = { ...next.live, ...live };
  return next;
}

export function setConnectivity(state: DeviceServiceState, connectivity: Partial<ConnectivityResponse>): DeviceServiceState {
  const next = cloneState(state);
  next.connectivity = { ...next.connectivity, ...connectivity };
  return next;
}

export function setAlerts(state: DeviceServiceState, alerts: Partial<AlertResponse>): DeviceServiceState {
  const next = cloneState(state);
  next.alerts = { ...next.alerts, ...alerts };
  return next;
}

export function appendHistory(
  state: DeviceServiceState,
  entry: Partial<HistorySummaryResponse> & Pick<HistorySummaryResponse, 'range' | 'resolution'>,
): DeviceServiceState {
  const next = cloneState(state);
  const point =
    entry.today?.[0] ?? entry.month?.[0] ?? entry.year?.[0] ?? entry.decade?.[0];
  if (!point) return next;

  switch (entry.range) {
    case 'month':
      next.history.month = [...next.history.month, point];
      break;
    case 'year':
      next.history.year = [...next.history.year, point];
      break;
    case 'decade':
      next.history.decade = [...next.history.decade, point];
      break;
    default:
      next.history.today = [...next.history.today, point];
  }
  return next;
}

export function setCommissioningSummary(
  state: DeviceServiceState,
  commissioning: Partial<CommissioningSummaryResponse>,
): DeviceServiceState {
  const next = cloneState(state);
  next.commissioning = { ...next.commissioning, ...commissioning };
  return next;
}

export function setTopology(state: DeviceServiceState, topology: Partial<TopologyResponse>): DeviceServiceState {
  const next = cloneState(state);
  next.topology = { ...next.topology, ...topology };
  return next;
}

export function setDeviceInfo(state: DeviceServiceState, device: Partial<DeviceInfoResponse>): DeviceServiceState {
  const next = cloneState(state);
  next.device = { ...next.device, ...device };
  return next;
}
