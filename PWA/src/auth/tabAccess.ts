import type { PwaRole } from '../../../dynamic_zero_export/pwa';

export type AppShellTab =
  | 'dashboard'
  | 'dzx'
  | 'site'
  | 'topology'
  | 'slots'
  | 'templates'
  | 'review'
  | 'engineer'
  | 'yaml';

const USER_TABS: AppShellTab[] = ['dashboard', 'dzx'];

const INSTALLER_TABS: AppShellTab[] = [
  'dashboard',
  'dzx',
  'site',
  'topology',
  'slots',
  'templates',
  'review',
  'yaml',
];

const MANUFACTURER_TABS: AppShellTab[] = [
  'dashboard',
  'dzx',
  'site',
  'topology',
  'slots',
  'templates',
  'review',
  'engineer',
  'yaml',
];

export function tabsForRole(role: PwaRole): AppShellTab[] {
  if (role === 'user') return USER_TABS;
  if (role === 'installer') return INSTALLER_TABS;
  return MANUFACTURER_TABS;
}

export function isTabAllowed(role: PwaRole, tab: AppShellTab): boolean {
  return tabsForRole(role).includes(tab);
}
