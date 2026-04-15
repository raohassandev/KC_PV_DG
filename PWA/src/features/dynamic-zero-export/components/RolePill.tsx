import { roleLabels, type PwaRole } from '../roles';

export function RolePill({ role }: { role: PwaRole }) {
  return <span className='role-pill'>{roleLabels[role]}</span>;
}

