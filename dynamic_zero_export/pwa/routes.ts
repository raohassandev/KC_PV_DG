import type { PwaRole } from './roles';
import { visibleNavigation } from './navigation';

export type PwaRoute = {
  path: string;
  pageId: string;
  label: string;
};

export function buildRoutes(role: PwaRole): PwaRoute[] {
  return visibleNavigation(role).map((item) => ({
    path: `/${item.id}`,
    pageId: item.id,
    label: item.label,
  }));
}

