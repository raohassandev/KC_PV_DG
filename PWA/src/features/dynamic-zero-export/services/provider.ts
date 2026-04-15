import { alertsFixture } from '../mock/alerts';
import { connectivityFixture } from '../mock/connectivity';
import { lifetimeHistoryFixture, monthHistoryFixture, todayHistoryFixture } from '../mock/history';
import { liveStatusFixture } from '../mock/liveStatus';
import { type AlertFeed } from '../../../../../dynamic_zero_export/pwa/contracts/alerts';
import { type ConnectivitySnapshot } from '../../../../../dynamic_zero_export/pwa/contracts/connectivity';
import { type EnergyHistorySeries } from '../../../../../dynamic_zero_export/pwa/contracts/history';
import { type LiveStatusSnapshot } from '../../../../../dynamic_zero_export/pwa/contracts/dashboard';
import { type PwaRole } from '../roles';
import { createDzxApiClient } from './apiClient';
import { toAlertFeed, toConnectivitySnapshot, toHistoryBundle, toLiveStatusSnapshot } from './apiTransforms';

export type ProviderMode = 'auto' | 'api' | 'mock';

export type DzxProvider = {
  mode: ProviderMode;
  baseUrl?: string;
  loadLiveStatus(_role: PwaRole): Promise<LiveStatusSnapshot>;
  loadHistory(_role: PwaRole): Promise<{ today: EnergyHistorySeries; month: EnergyHistorySeries; lifetime: EnergyHistorySeries }>;
  loadConnectivity(_role: PwaRole): Promise<ConnectivitySnapshot>;
  loadAlerts(_role: PwaRole): Promise<AlertFeed>;
};

function resolveBaseUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const stored = localStorage.getItem('dzx.apiBaseUrl');
  if (stored && stored.trim()) return stored.trim();
  const envBase = import.meta.env.VITE_DZX_API_BASE_URL as string | undefined;
  return envBase?.trim() || undefined;
}

function snapshotFallback(): LiveStatusSnapshot {
  return liveStatusFixture;
}

export function createDzxProvider(mode: ProviderMode = 'auto', baseUrl = resolveBaseUrl()): DzxProvider {
  const useApi = mode === 'api' || (mode === 'auto' && Boolean(baseUrl));
  const client = useApi && baseUrl ? createDzxApiClient(baseUrl) : undefined;
  return {
    mode,
    baseUrl,
    async loadLiveStatus() {
      if (!client) return snapshotFallback();
      return toLiveStatusSnapshot(await client.getLiveStatus());
    },
    async loadHistory() {
      if (!client) {
        return {
          today: todayHistoryFixture,
          month: monthHistoryFixture,
          lifetime: lifetimeHistoryFixture,
        };
      }
      return toHistoryBundle(await client.getHistory());
    },
    async loadConnectivity() {
      if (!client) return connectivityFixture;
      return toConnectivitySnapshot(await client.getConnectivity());
    },
    async loadAlerts() {
      if (!client) return alertsFixture;
      return toAlertFeed(await client.getAlerts());
    },
  };
}
