import {
  connectivitySummary,
  type ConnectivitySnapshot,
  type PwaRole,
} from '../../../../../dynamic_zero_export/pwa';
import { connectivityFixture } from '../mock/connectivity';

const CONNECTIVITY_KEY = 'dzx.connectivity';

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

