export type DeviceType = 'meter' | 'inverter';

export type DriverRegister = {
  paramKey: string;
  label: string;
  unit?: string;
  registerType: 'read' | 'holding' | 'coil' | 'discrete_input';
  address: number;
  valueKind:
    | 'U_WORD'
    | 'S_WORD'
    | 'U_DWORD'
    | 'S_DWORD'
    | 'U_QWORD'
    | 'S_QWORD'
    | 'FP32';
  wordOrder?: 'normal' | 'lowWordFirst';
  byteOrder?: 'ABCD' | 'BADC' | 'CDAB' | 'DCBA';
  scale?: number;
  precision?: number;
};

export type DriverDefinition = {
  id: string;
  name: string;
  vendor?: string;
  deviceType: DeviceType;
  notes?: string;
  recommendedPollMs?: number;
  registers: DriverRegister[];
  createdAt?: string;
  updatedAt?: string;
};

export type DriverMeta = Pick<DriverDefinition, 'id' | 'name' | 'vendor' | 'deviceType' | 'updatedAt'>;

