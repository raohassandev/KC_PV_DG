import {
  connectivitySummary,
  type ConnectivitySnapshot,
  type PwaRole,
} from '../../../../../dynamic_zero_export/pwa';
import { emptyConnectivitySnapshot } from '../emptyMonitoringState';
import { createDzxProvider, type ProviderMode } from './provider';
import { loadProviderMode } from './liveStatusService';

const CONNECTIVITY_KEY = 'dzx.connectivity';

function baseSnapshot(): ConnectivitySnapshot {
  return emptyConnectivitySnapshot();
}

export function loadConnectivitySnapshot(): ConnectivitySnapshot {
  if (typeof window === 'undefined') return baseSnapshot();
  try {
    const raw = localStorage.getItem(CONNECTIVITY_KEY);
    if (!raw) return baseSnapshot();
    return { ...baseSnapshot(), ...(JSON.parse(raw) as Partial<ConnectivitySnapshot>) };
  } catch {
    return baseSnapshot();
  }
}

export function saveConnectivitySnapshot(snapshot: ConnectivitySnapshot): ConnectivitySnapshot {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONNECTIVITY_KEY, JSON.stringify(snapshot));
    } catch {
      // ignore
    }
  }
  return snapshot;
}

export async function loadConnectivitySnapshotFromProvider(mode: ProviderMode = loadProviderMode()) {
  const provider = createDzxProvider(mode);
  const snapshot = await provider.loadConnectivity('user');
  return saveConnectivitySnapshot(snapshot);
}

export function buildConnectivityViewModel(role: PwaRole, snapshot = loadConnectivitySnapshot()) {
  return {
    role,
    title: snapshot.deviceName,
    summary: connectivitySummary(snapshot),
    snapshot,
    detailLines: [
      `Wi-Fi ${snapshot.wifi.state}`,
      `LAN ${snapshot.lan.state}`,
      `API ${snapshot.reachability.localApi ? 'ok' : 'down'}`,
      `Upstream meter ${snapshot.reachability.upstreamMeter ? 'reachable' : 'down'}`,
      `Downstream inverter ${snapshot.reachability.downstreamInverter ? 'reachable' : 'down'}`,
    ],
  };
}

export async function buildConnectivityViewModelFromProvider(role: PwaRole, mode: ProviderMode = loadProviderMode()) {
  const snapshot = await loadConnectivitySnapshotFromProvider(mode);
  return buildConnectivityViewModel(role, snapshot);
}
