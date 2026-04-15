export type ConnectivitySnapshot = {
  deviceName: string;
  firmwareVersion: string;
  buildId: string;
  wifi: {
    ssid?: string;
    signalDbm?: number;
    state: 'connected' | 'disconnected' | 'connecting' | 'ap-mode';
    ipAddress?: string;
    lastSeenAt?: string;
  };
  lan: {
    state: 'connected' | 'disconnected' | 'unknown';
    ipAddress?: string;
    macAddress?: string;
  };
  reachability: {
    localApi: boolean;
    upstreamMeter: boolean;
    downstreamInverter: boolean;
  };
  uptimeSec: number;
};

export function connectivitySummary(snapshot: ConnectivitySnapshot): string {
  return `${snapshot.deviceName} | Wi-Fi ${snapshot.wifi.state} | LAN ${snapshot.lan.state} | API ${snapshot.reachability.localApi ? 'ok' : 'down'}`;
}

