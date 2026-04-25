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
      'energy-history',
      'reliability',
      'basic-settings',
    ],
    editableFields: ['site.name', 'site.systemName', 'profile.locale'],
    restrictedActions: ['commissioning', 'firmware-tools', 'profile-registry', 'support-bundle'],
    diagnosticsAccess: 'limited',
    commissioningAccess: 'none',
    serviceAccess: 'none',
    ownerViews: ['energy-history', 'reliability'],
  },
  installer: {
    visiblePages: [
      'energy-history',
      'reliability',
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
    ownerViews: ['energy-history', 'reliability'],
  },
  manufacturer: {
    visiblePages: [
      'energy-history',
      'reliability',
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
    ownerViews: ['energy-history', 'reliability'],
  },
};

