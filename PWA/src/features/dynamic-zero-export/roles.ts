import {
  type PwaRole,
  rolePermissions,
  type RolePermissions,
} from '../../../../dynamic_zero_export/pwa';

export type { PwaRole, RolePermissions };
export { rolePermissions };

export const roleLabels: Record<PwaRole, string> = {
  user: 'User',
  installer: 'Installer',
  manufacturer: 'Manufacturer',
};

export function resolveRole(input: string | null | undefined): PwaRole {
  if (input === 'installer' || input === 'manufacturer' || input === 'user') {
    return input;
  }
  return 'user';
}
