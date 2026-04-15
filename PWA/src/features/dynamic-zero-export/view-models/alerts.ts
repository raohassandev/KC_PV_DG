import { buildAlertsViewModel, loadAlertFeed } from '../services/alertsService';
import type { PwaRole } from '../roles';

export function buildAlertViewModel(role: PwaRole) {
  return buildAlertsViewModel(role, loadAlertFeed());
}
