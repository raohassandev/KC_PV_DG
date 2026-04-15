import { buildHistoryViewModel, loadHistoryBundle } from '../services/historyService';
import type { PwaRole } from '../roles';

export function buildEnergyHistoryViewModel(role: PwaRole) {
  return buildHistoryViewModel(role, loadHistoryBundle());
}
