import { type AlertFeed } from '../../../../../dynamic_zero_export/pwa/contracts/alerts';
import { type ConnectivitySnapshot } from '../../../../../dynamic_zero_export/pwa/contracts/connectivity';
import { type EnergyHistorySeries } from '../../../../../dynamic_zero_export/pwa/contracts/history';
import { type LiveStatusSnapshot } from '../../../../../dynamic_zero_export/pwa/contracts/dashboard';
import { type PwaRole } from '../roles';
import {
  emptyAlertFeed,
  emptyConnectivitySnapshot,
  emptyHistoryBundle,
  emptyLiveStatusSnapshot,
} from '../emptyMonitoringState';
import { createDzxApiClient } from './apiClient';
import { toAlertFeed, toConnectivitySnapshot, toHistoryBundle, toLiveStatusSnapshot } from './apiTransforms';

export type ProviderMode = 'auto' | 'api';

export type DzxProvider = {
  mode: ProviderMode;
  baseUrl?: string;
  loadLiveStatus(_role: PwaRole): Promise<LiveStatusSnapshot>;
  loadHistory(
    _role: PwaRole,
  ): Promise<{ today: EnergyHistorySeries; month: EnergyHistorySeries; year: EnergyHistorySeries; decade: EnergyHistorySeries }>;
  loadConnectivity(_role: PwaRole): Promise<ConnectivitySnapshot>;
  loadAlerts(_role: PwaRole): Promise<AlertFeed>;
};

/** Optional gateway / monitoring API base (e.g. `VITE_DZX_API_BASE_URL` or same-origin `/api` behind a proxy). */
export function resolveDzxApiBaseUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const stored = localStorage.getItem('dzx.apiBaseUrl');
  if (stored && stored.trim()) return stored.trim();
  const envBase = import.meta.env.VITE_DZX_API_BASE_URL as string | undefined;
  if (envBase?.trim()) return envBase.trim();
  if (import.meta.env.DEV) return '';
  return undefined;
}

export function createDzxProvider(mode: ProviderMode = 'auto', baseUrl = resolveDzxApiBaseUrl()): DzxProvider {
  const useApi = baseUrl !== undefined;
  const client = useApi ? createDzxApiClient(baseUrl) : undefined;
  return {
    mode,
    baseUrl,
    async loadLiveStatus(role) {
      if (!client) return emptyLiveStatusSnapshot(role);
      try {
        return toLiveStatusSnapshot(await client.getLiveStatus());
      } catch {
        return emptyLiveStatusSnapshot(role);
      }
    },
    async loadHistory() {
      if (!client) return emptyHistoryBundle();
      try {
        return toHistoryBundle(await client.getHistory());
      } catch {
        return emptyHistoryBundle();
      }
    },
    async loadConnectivity() {
      if (!client) return emptyConnectivitySnapshot();
      try {
        return toConnectivitySnapshot(await client.getConnectivity());
      } catch {
        return emptyConnectivitySnapshot();
      }
    },
    async loadAlerts() {
      if (!client) return emptyAlertFeed();
      try {
        return toAlertFeed(await client.getAlerts());
      } catch {
        return emptyAlertFeed();
      }
    },
  };
}
