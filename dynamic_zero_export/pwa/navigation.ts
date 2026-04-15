import type { PwaRole } from './roles';
import { canAccessPage } from './permissions';

export type NavigationItem = {
  id: string;
  label: string;
  description: string;
  audience: PwaRole[];
};

export const navigationItems: NavigationItem[] = [
  { id: 'overview', label: 'Overview', description: 'Live plant status and summaries', audience: ['user', 'installer', 'manufacturer'] },
  { id: 'energy-history', label: 'Energy History', description: 'Daily, monthly, and lifetime energy', audience: ['user', 'installer', 'manufacturer'] },
  { id: 'power-flow', label: 'Power Flow', description: 'Real-time plant power flow', audience: ['user', 'installer', 'manufacturer'] },
  { id: 'connectivity', label: 'Connectivity', description: 'LAN/Wi-Fi and reachability', audience: ['user', 'installer', 'manufacturer'] },
  { id: 'alerts', label: 'Alerts', description: 'Warnings and events', audience: ['user', 'installer', 'manufacturer'] },
  { id: 'basic-settings', label: 'Site Settings', description: 'Site name and friendly settings', audience: ['user', 'installer', 'manufacturer'] },
  { id: 'commissioning', label: 'Commissioning', description: 'Installer setup and validation', audience: ['installer', 'manufacturer'] },
  { id: 'diagnostics', label: 'Diagnostics', description: 'Adapter and protocol diagnostics', audience: ['installer', 'manufacturer'] },
  { id: 'profile-registry', label: 'Profile Registry', description: 'Brand profiles and compatibility flags', audience: ['manufacturer'] },
  { id: 'support-bundle', label: 'Support Bundle', description: 'Manufacturer support export', audience: ['manufacturer'] },
];

export function visibleNavigation(role: PwaRole): NavigationItem[] {
  return navigationItems.filter((item) => item.audience.includes(role) && canAccessPage(role, item.id));
}

