import type { AlertFeed } from '../../../../../dynamic_zero_export/pwa/contracts/alerts';
import type { ConnectivitySnapshot } from '../../../../../dynamic_zero_export/pwa/contracts/connectivity';
import type { EnergyHistorySeries } from '../../../../../dynamic_zero_export/pwa/contracts/history';
import type { LiveStatusSnapshot } from '../../../../../dynamic_zero_export/pwa/contracts/dashboard';
import type { PwaRole } from '../roles';
import { createDzxApiClient, type DzxApiClient } from './apiClient';
import { createDzxProvider, type DzxProvider, type ProviderMode } from './provider';

export type LocalDeviceService = {
  mode: ProviderMode;
  client?: DzxApiClient;
  provider: DzxProvider;
  loadLiveStatus(role: PwaRole): Promise<LiveStatusSnapshot>;
  loadHistory(role: PwaRole): Promise<{ today: EnergyHistorySeries; month: EnergyHistorySeries; lifetime: EnergyHistorySeries }>;
  loadConnectivity(role: PwaRole): Promise<ConnectivitySnapshot>;
  loadAlerts(role: PwaRole): Promise<AlertFeed>;
  setProviderMode(mode: ProviderMode): Promise<void>;
  updateConnectivitySettings(body: unknown): Promise<void>;
  acknowledgeAlerts(ids: string[]): Promise<void>;
  simulateLiveStatus(body: Partial<LiveStatusSnapshot>): Promise<void>;
  simulateConnectivity(body: Partial<ConnectivitySnapshot>): Promise<void>;
  simulateAlerts(body: unknown): Promise<void>;
  appendHistory(body: unknown): Promise<void>;
};

function resolveBaseUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const stored = localStorage.getItem('dzx.apiBaseUrl');
  if (stored && stored.trim()) return stored.trim();
  const envBase = import.meta.env.VITE_DZX_API_BASE_URL as string | undefined;
  return envBase?.trim() || undefined;
}

export function createLocalDeviceService(mode: ProviderMode = 'auto', baseUrl = resolveBaseUrl()): LocalDeviceService {
  const provider = createDzxProvider(mode, baseUrl);
  const client = baseUrl ? createDzxApiClient(baseUrl) : undefined;
  return {
    mode,
    client,
    provider,
    async loadLiveStatus(role) {
      return provider.loadLiveStatus(role);
    },
    async loadHistory(role) {
      return provider.loadHistory(role);
    },
    async loadConnectivity(role) {
      return provider.loadConnectivity(role);
    },
    async loadAlerts(role) {
      return provider.loadAlerts(role);
    },
    async setProviderMode(mode) {
      if (client) {
        await client.setProviderMode(mode);
      }
    },
    async updateConnectivitySettings(body) {
      if (client) {
        await client.setConnectivitySettings(body);
      }
    },
    async acknowledgeAlerts(ids) {
      if (client) {
        await client.acknowledgeAlerts(ids);
      }
    },
    async simulateLiveStatus(body) {
      if (client) {
        await client.simulateLiveStatus(body);
      }
    },
    async simulateConnectivity(body) {
      if (client) {
        await client.simulateConnectivity(body);
      }
    },
    async simulateAlerts(body) {
      if (client) {
        await client.simulateAlerts(body);
      }
    },
    async appendHistory(body) {
      if (client) {
        await client.appendHistory(body);
      }
    },
  };
}
