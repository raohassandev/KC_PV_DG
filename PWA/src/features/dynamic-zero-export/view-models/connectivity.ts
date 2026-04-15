import {
  connectivitySummary,
  type ConnectivitySnapshot,
} from '../../../../../dynamic_zero_export/pwa';

export function buildConnectivityViewModel(snapshot: ConnectivitySnapshot) {
  return {
    title: snapshot.deviceName,
    summary: connectivitySummary(snapshot),
    connected: snapshot.wifi.state === 'connected' && snapshot.lan.state === 'connected',
    snapshot,
  };
}
