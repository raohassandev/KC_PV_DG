import type { PwaRole } from './roles';
import { canAccessPage } from './permissions';

export type NavigationItem = {
  id: string;
  label: string;
  description: string;
  audience: PwaRole[];
};

export const navigationItems: NavigationItem[] = [
  {
    id: 'energy-history',
    label: 'Energy History',
    description: 'Executive analytics — KPIs, charts, hourly through monthly views',
    audience: ['user', 'installer', 'manufacturer'],
  },
  {
    id: 'reliability',
    label: 'Reliability',
    description: 'Connectivity, reachability, and alerts in one view',
    audience: ['user', 'installer', 'manufacturer'],
  },
  { id: 'basic-settings', label: 'Site Settings', description: 'Site name and friendly settings', audience: ['user', 'installer', 'manufacturer'] },
  { id: 'commissioning', label: 'Commissioning', description: 'Installer setup and validation', audience: ['installer', 'manufacturer'] },
  { id: 'diagnostics', label: 'Diagnostics', description: 'Adapter and protocol diagnostics', audience: ['installer', 'manufacturer'] },
  { id: 'profile-registry', label: 'Profile Registry', description: 'Brand profiles and compatibility flags', audience: ['manufacturer'] },
  { id: 'support-bundle', label: 'Support Bundle', description: 'Manufacturer support export', audience: ['manufacturer'] },
];

export function visibleNavigation(role: PwaRole): NavigationItem[] {
  return navigationItems.filter((item) => item.audience.includes(role) && canAccessPage(role, item.id));
}

