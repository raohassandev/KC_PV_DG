import type { PwaRole } from '../roles';

export type DashboardCard = {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
};

export type LiveStatusSnapshot = {
  role: PwaRole;
  siteName: string;
  systemState: 'healthy' | 'degraded' | 'fallback' | 'faulted';
  powerKw: number;
  solarKw: number;
  gridImportKw: number;
  gridExportKw: number;
  generatorKw?: number;
  deviceOnline: boolean;
  connectivityLabel: string;
  alertsCount: number;
  localNetworkLabel: string;
  lastUpdatedAt: string;
};

export type DashboardModel = {
  cards: DashboardCard[];
  summary: string[];
  visibility: {
    userSummary: boolean;
    installerActions: boolean;
    manufacturerDiagnostics: boolean;
  };
};

