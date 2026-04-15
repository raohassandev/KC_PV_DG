import type { BrandProfile } from './brand-profiles/base';
import { genericProfile } from './brand-profiles/generic.stub';
import { growattProfile } from './brand-profiles/growatt.stub';
import { goodweProfile } from './brand-profiles/goodwe.stub';
import { huaweiProfile } from './brand-profiles/huawei.stub';
import { solisProfile } from './brand-profiles/solis.stub';

export type BrandProfileRegistry = Record<string, BrandProfile>;

export const brandProfileRegistry: BrandProfileRegistry = {
  [genericProfile.id]: genericProfile,
  [growattProfile.id]: growattProfile,
  [goodweProfile.id]: goodweProfile,
  [huaweiProfile.id]: huaweiProfile,
  [solisProfile.id]: solisProfile,
};

export function getBrandProfile(profileId: string): BrandProfile | undefined {
  return brandProfileRegistry[profileId];
}

export function listBrandProfiles(): BrandProfile[] {
  return Object.values(brandProfileRegistry);
}
