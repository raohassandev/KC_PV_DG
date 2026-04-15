import { buildRoleAwareLiveStatus, loadLiveStatus } from '../services/liveStatusService';
import type { PwaRole } from '../roles';

export function buildOverviewViewModel(role: PwaRole) {
  return buildRoleAwareLiveStatus(role, loadLiveStatus());
}
