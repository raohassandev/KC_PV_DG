import type { DashboardModel, LiveStatusSnapshot } from '../contracts/dashboard';

export function buildInstallerDashboard(snapshot: LiveStatusSnapshot): DashboardModel {
  return {
    cards: [
      { id: 'power', title: 'Plant Power', value: `${snapshot.powerKw.toFixed(1)} kW` },
      { id: 'generator', title: 'Generator', value: snapshot.generatorKw != null ? `${snapshot.generatorKw.toFixed(1)} kW` : 'n/a' },
      { id: 'alerts', title: 'Alerts', value: `${snapshot.alertsCount}` },
      { id: 'online', title: 'Device', value: snapshot.deviceOnline ? 'Online' : 'Offline' },
    ],
    summary: [
      `${snapshot.siteName} commissioning view`,
      `Last updated ${snapshot.lastUpdatedAt}`,
    ],
    visibility: { userSummary: true, installerActions: true, manufacturerDiagnostics: false },
  };
}

