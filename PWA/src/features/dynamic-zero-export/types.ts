import type {
  AlertFeed,
  ConnectivitySnapshot,
  DashboardModel,
  EnergyHistorySeries,
  LiveStatusSnapshot,
  PwaRole,
  SessionState,
} from '../../../../dynamic_zero_export/pwa';

export type Role = PwaRole;
export type { AlertFeed, ConnectivitySnapshot, DashboardModel, EnergyHistorySeries, LiveStatusSnapshot, SessionState };

export type ServiceResult<T> = {
  data: T;
  source: 'fixture' | 'storage';
  updatedAt: string;
};

export type OverviewViewModel = DashboardModel & {
  role: Role;
  live: LiveStatusSnapshot;
  connectivity: ConnectivitySnapshot;
  alerts: AlertFeed;
};

export type ConnectivityViewModel = {
  role: Role;
  title: string;
  summary: string;
  snapshot: ConnectivitySnapshot;
  detailLines: string[];
};

export type AlertsViewModel = {
  role: Role;
  summary: string[];
  items: Array<{
    id: string;
    code: string;
    severity: string;
    title: string;
    message: string;
    timestamp: string;
    source: string;
    debugDetails?: string;
    actionable?: boolean;
  }>;
};

export type HistoryViewModel = {
  role: Role;
  today: EnergyHistorySeries;
  month: EnergyHistorySeries;
  lifetime: EnergyHistorySeries;
  totals: {
    today: ReturnType<typeof aggregateEnergyTotals>;
    month: ReturnType<typeof aggregateEnergyTotals>;
    lifetime: ReturnType<typeof aggregateEnergyTotals>;
  };
  highlights: string[];
};

export type HistoryTotals = {
  solarKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  generatorKwh: number;
  curtailedKwh: number;
};

export function aggregateEnergyTotals(points: EnergyHistorySeries['points']): HistoryTotals {
  return points.reduce(
    (totals: HistoryTotals, point) => ({
      solarKwh: totals.solarKwh + point.solarKwh,
      gridImportKwh: totals.gridImportKwh + point.gridImportKwh,
      gridExportKwh: totals.gridExportKwh + point.gridExportKwh,
      generatorKwh: totals.generatorKwh + point.generatorKwh,
      curtailedKwh: totals.curtailedKwh + point.curtailedKwh,
    }),
    { solarKwh: 0, gridImportKwh: 0, gridExportKwh: 0, generatorKwh: 0, curtailedKwh: 0 },
  );
}
