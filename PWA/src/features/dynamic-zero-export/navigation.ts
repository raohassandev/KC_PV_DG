import type { SiteConfig } from '../../siteProfileSchema';
import { type PwaRole, visibleNavigation } from '../../../../dynamic_zero_export/pwa';

export type FeaturePageId =
  | 'overview'
  | 'energy-history'
  | 'connectivity'
  | 'alerts'
  | 'commissioning'
  | 'diagnostics';

export type FeatureNavigationItem = {
  id: FeaturePageId;
  label: string;
  description: string;
};

export const featureNavigationByRole: Record<PwaRole, FeatureNavigationItem[]> = {
  user: visibleNavigation('user').filter((item) =>
    ['overview', 'energy-history', 'connectivity', 'alerts'].includes(item.id),
  ) as FeatureNavigationItem[],
  installer: visibleNavigation('installer').filter((item) =>
    ['overview', 'energy-history', 'connectivity', 'alerts', 'commissioning', 'diagnostics'].includes(item.id),
  ) as FeatureNavigationItem[],
  manufacturer: visibleNavigation('manufacturer').filter((item) =>
    ['overview', 'energy-history', 'connectivity', 'alerts', 'commissioning', 'diagnostics'].includes(item.id),
  ) as FeatureNavigationItem[],
};

export const featurePageOrder: FeaturePageId[] = [
  'overview',
  'energy-history',
  'connectivity',
  'alerts',
  'commissioning',
  'diagnostics',
];

/**
 * Monitoring shell tabs: owner-style tabs are identical in both controller modes.
 * Installer/manufacturer get the DZX API "Commissioning" summary only in `dzx_virtual_meter`
 * (full commissioning stays in the main app Commissioning workspace).
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
