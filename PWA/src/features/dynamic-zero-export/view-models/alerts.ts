import {
  buildAlertViewModel as buildContractAlertViewModel,
  type AlertFeed,
  type PwaRole,
} from '../../../../../dynamic_zero_export/pwa';

export function buildAlertViewModel(feed: AlertFeed, role: PwaRole) {
  return buildContractAlertViewModel(feed, role);
}
