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
