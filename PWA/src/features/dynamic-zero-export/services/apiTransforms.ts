import type {
  AlertFeed,
  ConnectivitySnapshot,
  EnergyHistorySeries,
  EnergyHistoryPoint,
  LiveStatusSnapshot,
} from '../../../../../dynamic_zero_export/pwa';
import type {
  AlertResponse,
  ConnectivityResponse,
  HistorySummaryResponse,
  LiveStatusResponse,
} from '../../../../../dynamic_zero_export/api_contract';

export function toLiveStatusSnapshot(response: LiveStatusResponse): LiveStatusSnapshot {
  return {
    role: response.role,
    siteName: response.siteName,
    systemState: response.controllerState,
    powerKw: response.powerKw,
    solarKw: response.solarKw,
    gridImportKw: response.gridImportKw,
    gridExportKw: response.gridExportKw,
    generatorKw: response.generatorKw,
    deviceOnline: response.systemOnline,
    connectivityLabel: response.systemOnline ? 'Online' : 'Offline',
    alertsCount: response.alertsCount,
    localNetworkLabel: 'LAN-first local access',
    lastUpdatedAt: response.lastUpdatedAt,
  };
}

export function toConnectivitySnapshot(response: ConnectivityResponse): ConnectivitySnapshot {
  return {
    deviceName: response.deviceName,
    firmwareVersion: response.firmwareVersion,
    buildId: response.buildId,
    wifi: {
      ssid: response.wifi.ssid,
      signalDbm: response.wifi.signalDbm,
      state: response.wifi.state,
      ipAddress: response.wifi.ipAddress,
      lastSeenAt: undefined,
    },
    lan: {
      state: response.lan.state,
      ipAddress: response.lan.ipAddress,
      macAddress: undefined,
    },
    reachability: response.reachability,
    uptimeSec: response.uptimeSec,
  };
}

export function toAlertFeed(response: AlertResponse): AlertFeed {
  return {
    active: response.active.map((item) => ({
      id: item.id,
      code: item.code,
      severity: item.severity,
      title: item.title,
      message: item.userMessage,
      timestamp: item.timestamp,
      source: 'controller',
      debugDetails: item.debugMessage,
      acknowledged: item.acknowledged,
    })),
    history: response.recent.map((item) => ({
      id: item.id,
      code: item.code,
      severity: item.severity,
      title: item.title,
      message: item.message,
      timestamp: item.timestamp,
      source: 'controller',
    })),
    summary: response.summary,
  };
}

export function toHistorySeries(points: HistorySummaryResponse['today'], granularity: EnergyHistorySeries['granularity']): EnergyHistorySeries {
  return {
    granularity,
    points: points.map((point) => ({ ...point })) as EnergyHistoryPoint[],
  };
}

export function toHistoryBundle(response: HistorySummaryResponse): { today: EnergyHistorySeries; month: EnergyHistorySeries; lifetime: EnergyHistorySeries } {
  return {
    today: toHistorySeries(response.today, '5m'),
    month: toHistorySeries(response.month, 'day'),
    lifetime: toHistorySeries(response.lifetime, 'month'),
  };
}
