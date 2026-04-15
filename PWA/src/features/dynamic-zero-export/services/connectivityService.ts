import {
  connectivitySummary,
  type ConnectivitySnapshot,
  type PwaRole,
} from '../../../../../dynamic_zero_export/pwa';
import { connectivityFixture } from '../mock/connectivity';
import { createDzxProvider, type ProviderMode } from './provider';

const CONNECTIVITY_KEY = 'dzx.connectivity';
const CONNECTIVITY_PROVIDER_KEY = 'dzx.connectivityProviderMode';

export function loadConnectivitySnapshot(): ConnectivitySnapshot {
  if (typeof window === 'undefined') return connectivityFixture;
  try {
    const raw = localStorage.getItem(CONNECTIVITY_KEY);
    if (!raw) return connectivityFixture;
    return { ...connectivityFixture, ...(JSON.parse(raw) as Partial<ConnectivitySnapshot>) };
  } catch {
    return connectivityFixture;
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

export function loadConnectivityProviderMode(): ProviderMode {
  if (typeof window === 'undefined') return 'auto';
  const stored = localStorage.getItem(CONNECTIVITY_PROVIDER_KEY);
  if (stored === 'api' || stored === 'mock' || stored === 'auto') return stored;
  return 'auto';
}

export function saveConnectivityProviderMode(mode: ProviderMode): ProviderMode {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONNECTIVITY_PROVIDER_KEY, mode);
    } catch {
      // ignore
    }
  }
  return mode;
}

export async function loadConnectivitySnapshotFromProvider(mode: ProviderMode = loadConnectivityProviderMode()) {
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

export async function buildConnectivityViewModelFromProvider(role: PwaRole, mode: ProviderMode = loadConnectivityProviderMode()) {
  const snapshot = await loadConnectivitySnapshotFromProvider(mode);
  return buildConnectivityViewModel(role, snapshot);
}
