import { createBrandProfile } from './base';

export const huaweiProfile = createBrandProfile({
  id: 'huawei-default',
  vendor: 'Huawei',
  displayName: 'Huawei Virtual Meter Profile',
  expectedVirtualMeterConcept: 'export-limit meter compatible with Huawei inverter expectations',
  registerMap: [
    { register: '0x0001', scaling: 0.1, signed: true, description: 'active power setpoint placeholder' },
    { register: '0x0002', scaling: 0.1, description: 'grid voltage placeholder' },
  ],
  scaling: [
    { field: 'power', factor: 0.1, note: 'placeholder scaling' },
  ],
  notes: ['Stub profile for starter kit', 'Register map must be validated on site'],
  supportedModes: ['pass_through', 'adjusted', 'safe_fallback'],
});
