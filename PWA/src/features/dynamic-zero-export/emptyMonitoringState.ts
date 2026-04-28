import type { AlertFeed } from '../../../../dynamic_zero_export/pwa/contracts/alerts';
import type { ConnectivitySnapshot } from '../../../../dynamic_zero_export/pwa/contracts/connectivity';
import type { EnergyHistorySeries } from '../../../../dynamic_zero_export/pwa/contracts/history';
import type { LiveStatusSnapshot } from '../../../../dynamic_zero_export/pwa/contracts/dashboard';
import type { PwaRole } from './roles';

function emptySeries(granularity: EnergyHistorySeries['granularity']): EnergyHistorySeries {
  return { granularity, points: [] };
}

export function emptyLiveStatusSnapshot(role: PwaRole = 'user'): LiveStatusSnapshot {
  return {
    role,
    siteName: '',
    systemState: 'faulted',
    powerKw: 0,
    solarKw: 0,
    gridImportKw: 0,
    gridExportKw: 0,
    generatorKw: 0,
    deviceOnline: false,
    connectivityLabel: 'Monitoring API unavailable',
    alertsCount: 0,
    localNetworkLabel: '',
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function emptyHistoryBundle(): {
  today: EnergyHistorySeries;
  month: EnergyHistorySeries;
  year: EnergyHistorySeries;
  decade: EnergyHistorySeries;
} {
  return {
    today: emptySeries('hour'),
    month: emptySeries('day'),
    year: emptySeries('month'),
    decade: emptySeries('year'),
  };
}

export function emptyConnectivitySnapshot(): ConnectivitySnapshot {
  return {
    deviceName: '',
    firmwareVersion: '',
    buildId: '',
    wifi: { state: 'disconnected' },
    lan: { state: 'unknown' },
    reachability: {
      localApi: false,
      upstreamMeter: false,
      downstreamInverter: false,
    },
    uptimeSec: 0,
  };
}

export function emptyAlertFeed(): AlertFeed {
  return {
    active: [],
    history: [],
    summary: { criticalCount: 0, warningCount: 0, infoCount: 0 },
  };
}
