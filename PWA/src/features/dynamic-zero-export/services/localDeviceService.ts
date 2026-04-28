import type { AlertFeed } from '../../../../../dynamic_zero_export/pwa/contracts/alerts';
import type { ConnectivitySnapshot } from '../../../../../dynamic_zero_export/pwa/contracts/connectivity';
import type { EnergyHistorySeries } from '../../../../../dynamic_zero_export/pwa/contracts/history';
import type { LiveStatusSnapshot } from '../../../../../dynamic_zero_export/pwa/contracts/dashboard';
import type { PwaRole } from '../roles';
import { createDzxApiClient, type DzxApiClient } from './apiClient';
import {
  createDzxProvider,
  resolveDzxApiBaseUrl,
  type DzxProvider,
  type ProviderMode,
} from './provider';

export type LocalDeviceService = {
  mode: ProviderMode;
  client?: DzxApiClient;
  provider: DzxProvider;
  loadLiveStatus(role: PwaRole): Promise<LiveStatusSnapshot>;
  loadHistory(
    role: PwaRole,
  ): Promise<{ today: EnergyHistorySeries; month: EnergyHistorySeries; year: EnergyHistorySeries; decade: EnergyHistorySeries }>;
  loadConnectivity(role: PwaRole): Promise<ConnectivitySnapshot>;
  loadAlerts(role: PwaRole): Promise<AlertFeed>;
  setProviderMode(mode: ProviderMode): Promise<void>;
  updateConnectivitySettings(body: unknown): Promise<void>;
  acknowledgeAlerts(ids: string[]): Promise<void>;
};

export function createLocalDeviceService(
  mode: ProviderMode = 'auto',
  baseUrl = resolveDzxApiBaseUrl(),
): LocalDeviceService {
  const provider = createDzxProvider(mode, baseUrl);
  const client = baseUrl !== undefined ? createDzxApiClient(baseUrl) : undefined;
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
  };
}
