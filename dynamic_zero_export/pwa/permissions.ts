import { rolePermissions, type PwaRole } from './roles';

export type PermissionCheck = {
  role: PwaRole;
  page: string;
  canView: boolean;
  canEdit: boolean;
  canDiagnose: boolean;
  canCommission: boolean;
};

export function getPermissions(role: PwaRole) {
  return rolePermissions[role];
}

export function canAccessPage(role: PwaRole, page: string): boolean {
  return getPermissions(role).visiblePages.includes(page);
}

export function canEditField(role: PwaRole, fieldPath: string): boolean {
  const permissions = getPermissions(role);
  return permissions.editableFields.includes('*') || permissions.editableFields.some((pattern) => {
    if (pattern === '*') return true;
    if (pattern.endsWith('.*')) return fieldPath.startsWith(pattern.slice(0, -2));
    return pattern === fieldPath;
  });
}

export function describePermission(role: PwaRole, page: string): PermissionCheck {
  const permissions = getPermissions(role);
  return {
    role,
    page,
    canView: canAccessPage(role, page),
    canEdit: canEditField(role, page),
    canDiagnose: permissions.diagnosticsAccess !== 'none',
    canCommission: permissions.commissioningAccess === 'full',
  };
}

