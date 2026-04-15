import { createBrandProfile } from './base';

export const goodweProfile = createBrandProfile({
  id: 'goodwe-default',
  vendor: 'GoodWe',
  displayName: 'GoodWe Virtual Meter Profile',
  expectedVirtualMeterConcept: 'pass-through or adjusted export-limiting meter',
  registerMap: [
    { register: '0x0001', scaling: 0.1, signed: true, description: 'active power setpoint placeholder' },
  ],
  scaling: [{ field: 'power', factor: 0.1, note: 'placeholder scaling' }],
  notes: ['Stub profile for starter kit', 'Real register mapping to be added later'],
  supportedModes: ['pass_through', 'adjusted', 'safe_fallback'],
});
