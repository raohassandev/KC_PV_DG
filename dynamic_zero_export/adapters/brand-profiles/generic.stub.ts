import { createBrandProfile } from './base';

export const genericProfile = createBrandProfile({
  id: 'default-virtual-meter',
  vendor: 'Generic',
  displayName: 'Generic Virtual Meter Profile',
  expectedVirtualMeterConcept: 'starter-kit generic export-limiting meter',
  registerMap: [
    { register: '0x0001', scaling: 0.1, signed: true, description: 'active power placeholder' },
  ],
  scaling: [{ field: 'power', factor: 0.1, note: 'placeholder scaling' }],
  notes: ['Generic fallback profile for starter kit'],
  supportedModes: ['pass_through', 'adjusted', 'safe_fallback'],
});

