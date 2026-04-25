import type { SiteConfig } from '../../siteProfileSchema';
import { type PwaRole, visibleNavigation } from '../../../../dynamic_zero_export/pwa';

export type FeaturePageId =
  | 'energy-history'
  | 'reliability'
  | 'commissioning'
  | 'diagnostics';

export type FeatureNavigationItem = {
  id: FeaturePageId;
  label: string;
  description: string;
};

export const featureNavigationByRole: Record<PwaRole, FeatureNavigationItem[]> = {
  user: visibleNavigation('user').filter((item) =>
    ['energy-history', 'reliability'].includes(item.id),
  ) as FeatureNavigationItem[],
  installer: visibleNavigation('installer').filter((item) =>
    ['energy-history', 'reliability', 'commissioning', 'diagnostics'].includes(item.id),
  ) as FeatureNavigationItem[],
  manufacturer: visibleNavigation('manufacturer').filter((item) =>
    ['energy-history', 'reliability', 'commissioning', 'diagnostics'].includes(item.id),
  ) as FeatureNavigationItem[],
};

export const featurePageOrder: FeaturePageId[] = [
  'energy-history',
  'reliability',
  'commissioning',
  'diagnostics',
];

/**
 * Monitoring shell tabs: live plant snapshot lives on the main **Dashboard**; this shell is
 * energy analytics, reliability (connectivity + alerts), plus commissioning/diagnostics for privileged roles.
 */
export function monitoringNavItemsFor(
  role: PwaRole,
  controllerRuntimeMode: SiteConfig['controllerRuntimeMode'],
): FeatureNavigationItem[] {
  const all = featureNavigationByRole[role];
  if (controllerRuntimeMode === 'sync_controller') {
    return all.filter((item) => item.id !== 'commissioning');
  }
  return all;
}
