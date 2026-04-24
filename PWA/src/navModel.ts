import type { PwaRole } from '../../dynamic_zero_export/pwa';
import type { SiteConfig } from './siteProfileSchema';

export type WorkspaceId = 'operation' | 'commissioning';

export type AppPageId =
  | 'dashboard'
  | 'dzx'
  | 'site'
  | 'topology'
  | 'slots'
  | 'templates'
  | 'review'
  | 'engineer'
  | 'yaml';

export type NavPage = {
  id: AppPageId;
  label: string;
  workspace: WorkspaceId;
  /** Hard role gate. */
  roles: PwaRole[];
  /** Optional feature gate that depends on commissioning config. */
  visible?: (config: SiteConfig) => boolean;
};

export const NAV_PAGES: NavPage[] = [
  // Operation
  { id: 'dashboard', label: 'Dashboard', workspace: 'operation', roles: ['user', 'installer', 'manufacturer'] },
  {
    id: 'dzx',
    label: 'Dynamic Zero Export',
    workspace: 'operation',
    roles: ['user', 'installer', 'manufacturer'],
    visible: (config) => config.controllerRuntimeMode === 'dzx_virtual_meter',
  },

  // Commissioning
  { id: 'site', label: 'Site Setup', workspace: 'commissioning', roles: ['installer', 'manufacturer'] },
  { id: 'topology', label: 'Topology', workspace: 'commissioning', roles: ['installer', 'manufacturer'] },
  { id: 'slots', label: 'Source Slots', workspace: 'commissioning', roles: ['installer', 'manufacturer'] },
  { id: 'templates', label: 'Templates', workspace: 'commissioning', roles: ['installer', 'manufacturer'] },
  { id: 'review', label: 'Validation', workspace: 'commissioning', roles: ['installer', 'manufacturer'] },
  { id: 'yaml', label: 'YAML Export', workspace: 'commissioning', roles: ['installer', 'manufacturer'] },
  { id: 'engineer', label: 'Engineer Actions', workspace: 'commissioning', roles: ['manufacturer'] },
];

export function workspacesForRole(role: PwaRole): WorkspaceId[] {
  if (role === 'user') return ['operation'];
  return ['operation', 'commissioning'];
}

export function visiblePagesFor(role: PwaRole, workspace: WorkspaceId, config: SiteConfig): NavPage[] {
  return NAV_PAGES.filter((p) => p.workspace === workspace && p.roles.includes(role) && (p.visible ? p.visible(config) : true));
}

export function pageById(id: AppPageId): NavPage | undefined {
  return NAV_PAGES.find((p) => p.id === id);
}

