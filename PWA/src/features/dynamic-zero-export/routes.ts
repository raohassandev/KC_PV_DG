import { featureNavigationByRole, type FeaturePageId } from './navigation';
import { type PwaRole } from './roles';

export type FeatureRoute = {
  id: FeaturePageId;
  path: string;
  label: string;
};

export function buildFeatureRoutes(role: PwaRole): FeatureRoute[] {
  return featureNavigationByRole[role].map((item) => ({
    id: item.id,
    path: `#/dynamic-zero-export/${item.id}`,
    label: item.label,
  }));
}

