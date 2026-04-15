import type { DashboardModel, LiveStatusSnapshot } from '../contracts/dashboard';

export function buildManufacturerDashboard(snapshot: LiveStatusSnapshot): DashboardModel {
  return {
    cards: [
      { id: 'power', title: 'Plant Power', value: `${snapshot.powerKw.toFixed(1)} kW` },
      { id: 'alerts', title: 'Alerts', value: `${snapshot.alertsCount}` },
      { id: 'connectivity', title: 'Connectivity', value: snapshot.connectivityLabel },
      { id: 'firmware', title: 'Build', value: snapshot.lastUpdatedAt },
    ],
    summary: [
      `${snapshot.siteName} support view`,
      `Diagnostics: ${snapshot.deviceOnline ? 'healthy' : 'attention needed'}`,
    ],
    visibility: { userSummary: true, installerActions: true, manufacturerDiagnostics: true },
  };
}

