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
  HistoryPoint,
  HistorySummaryResponse,
  LiveStatusResponse,
} from '../../../../../dynamic_zero_export/api_contract';
import { historyExample } from '../../../../../dynamic_zero_export/api_contract/examples';

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

export function toHistorySeries(
  points: HistorySummaryResponse['today'] | undefined,
  granularity: EnergyHistorySeries['granularity'],
): EnergyHistorySeries {
  const list = Array.isArray(points) ? points : [];
  return {
    granularity,
    points: list.map((point) => ({ ...point })) as EnergyHistoryPoint[],
  };
}

type HistoryWire = HistorySummaryResponse & { lifetime?: HistoryPoint[] };

function yearPointsFromWire(response: HistoryWire): HistoryPoint[] {
  if (Array.isArray(response.year)) return response.year;
  return historyExample.year;
}

function decadePointsFromWire(response: HistoryWire): HistoryPoint[] {
  if (Array.isArray(response.decade)) return response.decade;
  if (Array.isArray(response.lifetime) && response.lifetime.length > 0) {
    return response.lifetime;
  }
  return historyExample.decade;
}

export function toHistoryBundle(response: HistorySummaryResponse): {
  today: EnergyHistorySeries;
  month: EnergyHistorySeries;
  year: EnergyHistorySeries;
  decade: EnergyHistorySeries;
} {
  const wire = response as HistoryWire;
  return {
    today: toHistorySeries(wire.today, 'hour'),
    month: toHistorySeries(wire.month, 'day'),
    year: toHistorySeries(yearPointsFromWire(wire), 'month'),
    decade: toHistorySeries(decadePointsFromWire(wire), 'year'),
  };
}
