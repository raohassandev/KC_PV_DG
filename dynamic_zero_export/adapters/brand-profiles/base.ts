export type RegisterMapEntry = {
  register: string;
  scaling: number;
  signed?: boolean;
  description: string;
};

export type BrandProfile = {
  id: string;
  vendor: string;
  displayName: string;
  expectedVirtualMeterConcept: string;
  registerMap: RegisterMapEntry[];
  scaling: Array<{ field: string; factor: number; note: string }>;
  notes: string[];
  supportedModes: string[];
  validate?: (config: unknown) => string[];
};

export function createBrandProfile(profile: BrandProfile) {
  return profile;
}
