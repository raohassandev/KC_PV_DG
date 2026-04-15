import { buildConnectivityViewModel as buildServiceConnectivityViewModel, loadConnectivitySnapshot } from '../services/connectivityService';
import type { PwaRole } from '../roles';

export function buildConnectivityViewModel(role: PwaRole) {
  return buildServiceConnectivityViewModel(role, loadConnectivitySnapshot());
}
