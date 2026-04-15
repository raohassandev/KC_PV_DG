import type { DashboardModel, LiveStatusSnapshot } from '../contracts/dashboard';

export function buildUserDashboard(snapshot: LiveStatusSnapshot): DashboardModel {
  return {
    cards: [
      { id: 'power', title: 'Plant Power', value: `${snapshot.powerKw.toFixed(1)} kW`, subtitle: 'Current output', trend: 'flat' },
      { id: 'solar', title: 'Solar', value: `${snapshot.solarKw.toFixed(1)} kW`, subtitle: 'PV generation', trend: 'up' },
      { id: 'grid', title: 'Grid', value: `${snapshot.gridImportKw.toFixed(1)} / ${snapshot.gridExportKw.toFixed(1)} kW`, subtitle: 'Import / export' },
      { id: 'status', title: 'Status', value: snapshot.systemState, subtitle: snapshot.connectivityLabel },
    ],
    summary: [
      `${snapshot.siteName} is ${snapshot.systemState}`,
      `Connectivity: ${snapshot.connectivityLabel}`,
    ],
    visibility: { userSummary: true, installerActions: false, manufacturerDiagnostics: false },
  };
}

