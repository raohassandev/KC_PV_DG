import type {
  CommissioningSummaryResponse,
  ConfigReviewResponse,
} from '../../../../../dynamic_zero_export/api_contract';
import { createDzxApiClient } from './apiClient';
import { resolveDzxApiBaseUrl, type ProviderMode } from './provider';

export type CommissioningApiBundle = {
  commissioning: CommissioningSummaryResponse | null;
  configReview: ConfigReviewResponse | null;
};

export type CommissioningFetchOptions = {
  baseUrl?: string;
};

export async function fetchCommissioningApiBundle(
  _mode: ProviderMode,
  options?: CommissioningFetchOptions,
): Promise<CommissioningApiBundle> {
  const baseUrl = options?.baseUrl ?? resolveDzxApiBaseUrl();
  const useClient = baseUrl !== undefined;
  if (!useClient) {
    return { commissioning: null, configReview: null };
  }
  const client = createDzxApiClient(baseUrl);
  const [commissioning, configReview] = await Promise.all([
    client.getCommissioning(),
    client.getConfigReview(),
  ]);
  return { commissioning, configReview };
}
