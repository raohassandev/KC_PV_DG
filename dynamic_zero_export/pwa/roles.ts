export type PwaRole = 'manufacturer' | 'installer' | 'user';

export type RolePermissions = {
  visiblePages: string[];
  editableFields: string[];
  restrictedActions: string[];
  diagnosticsAccess: 'none' | 'limited' | 'full';
  commissioningAccess: 'none' | 'read' | 'full';
  serviceAccess: 'none' | 'read' | 'full';
  ownerViews: string[];
};

export const rolePermissions: Record<PwaRole, RolePermissions> = {
  user: {
    visiblePages: [
      'overview',
      'energy-history',
      'power-flow',
      'connectivity',
      'alerts',
      'basic-settings',
    ],
    editableFields: ['site.name', 'site.systemName', 'profile.locale'],
    restrictedActions: ['commissioning', 'firmware-tools', 'profile-registry', 'support-bundle'],
    diagnosticsAccess: 'limited',
    commissioningAccess: 'none',
    serviceAccess: 'none',
    ownerViews: ['overview', 'energy-history', 'connectivity', 'alerts'],
  },
  installer: {
    visiblePages: [
      'overview',
      'energy-history',
      'power-flow',
      'connectivity',
      'alerts',
      'basic-settings',
      'commissioning',
      'topology',
      'meter-source',
      'inverter-profile',
      'policy',
      'diagnostics',
      'config-review',
      'export-import',
    ],
    editableFields: [
      'site.name',
      'site.systemName',
      'topology.*',
      'meterInput.*',
      'virtualMeter.*',
      'policy.*',
      'connectivity.*',
    ],
    restrictedActions: ['profile-registry', 'support-bundle'],
    diagnosticsAccess: 'full',
    commissioningAccess: 'full',
    serviceAccess: 'read',
    ownerViews: ['overview', 'energy-history', 'connectivity', 'alerts'],
  },
  manufacturer: {
    visiblePages: [
      'overview',
      'energy-history',
      'power-flow',
      'connectivity',
      'alerts',
      'basic-settings',
      'commissioning',
      'topology',
      'meter-source',
      'inverter-profile',
      'policy',
      'diagnostics',
      'config-review',
      'export-import',
      'profile-registry',
      'firmware-service',
      'adapter-health',
      'event-trace',
      'support-bundle',
    ],
    editableFields: ['*'],
    restrictedActions: [],
    diagnosticsAccess: 'full',
    commissioningAccess: 'full',
    serviceAccess: 'full',
    ownerViews: ['overview', 'energy-history', 'connectivity', 'alerts'],
  },
};

