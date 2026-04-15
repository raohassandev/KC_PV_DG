import type { ConnectivitySnapshot } from '../contracts/connectivity';

export function connectivityViewModel(snapshot: ConnectivitySnapshot) {
  return {
    title: snapshot.deviceName,
    status: snapshot.wifi.state === 'connected' && snapshot.lan.state === 'connected' ? 'healthy' : 'attention',
    summary: [
      `Wi-Fi: ${snapshot.wifi.state}`,
      `LAN: ${snapshot.lan.state}`,
      `API: ${snapshot.reachability.localApi ? 'reachable' : 'down'}`,
    ],
    details: snapshot,
  };
}

