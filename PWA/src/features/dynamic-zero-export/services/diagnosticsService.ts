import type {
  ApiSnapshotResponse,
  DeviceInfoResponse,
  TopologyResponse,
} from '../../../../../dynamic_zero_export/api_contract';
import { createDzxApiClient } from './apiClient';
import { resolveDzxApiBaseUrl, type ProviderMode } from './provider';

export type DiagnosticsApiBundle = {
  topology: TopologyResponse | null;
  device: DeviceInfoResponse | null;
  snapshot: ApiSnapshotResponse | null;
};

export type DiagnosticsFetchOptions = {
  /** When set (e.g. in tests), skips `resolveDzxApiBaseUrl()`. */
  baseUrl?: string;
};

export async function fetchDiagnosticsApiBundle(
  mode: ProviderMode,
  options?: DiagnosticsFetchOptions,
): Promise<DiagnosticsApiBundle> {
  const baseUrl = options?.baseUrl ?? resolveDzxApiBaseUrl();
  const useClient = mode !== 'mock' && baseUrl !== undefined;
  if (!useClient) {
    return { topology: null, device: null, snapshot: null };
  }
  const client = createDzxApiClient(baseUrl);
  const [topology, device, snapshot] = await Promise.all([
    client.getTopology(),
    client.getDeviceInfo(),
    client.getSnapshot(),
  ]);
  return { topology, device, snapshot };
}
