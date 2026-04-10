export type DeviceType = 'none' | 'em500' | 'huawei';

export type SourceRole = 'none' | 'grid_meter' | 'generator_meter' | 'inverter';

export type SourceSlot = {
  id: string;
  label: string;
  enabled: boolean;
  deviceType: DeviceType;
  role: SourceRole;
  modbusId: number;
  capacityKw: number;
  ipHint?: string;
  notes?: string;
};

export type SiteConfig = {
  siteName: string;
  boardName: string;
  boardIp: string;
  wifiSsid: string;
  controllerMode:
    | 'disabled'
    | 'grid_zero_export'
    | 'grid_limited_export'
    | 'grid_limited_import';
  exportLimitKw: number;
  importLimitKw: number;
  pvRatedKw: number;
  deadbandKw: number;
  controlGain: number;
  rampPctStep: number;
  minPvPercent: number;
  maxPvPercent: number;
  slots: SourceSlot[];
};

export const defaultSlots: SourceSlot[] = [
  {
    id: 'grid_1',
    label: 'Grid Meter 1',
    enabled: true,
    deviceType: 'em500',
    role: 'grid_meter',
    modbusId: 1,
    capacityKw: 0,
  },
  {
    id: 'grid_2',
    label: 'Grid Meter 2',
    enabled: false,
    deviceType: 'none',
    role: 'none',
    modbusId: 2,
    capacityKw: 0,
  },
  {
    id: 'gen_1',
    label: 'Generator Meter 1',
    enabled: false,
    deviceType: 'none',
    role: 'generator_meter',
    modbusId: 3,
    capacityKw: 500,
  },
  {
    id: 'gen_2',
    label: 'Generator Meter 2',
    enabled: false,
    deviceType: 'none',
    role: 'generator_meter',
    modbusId: 4,
    capacityKw: 500,
  },
  {
    id: 'gen_3',
    label: 'Generator Meter 3',
    enabled: false,
    deviceType: 'none',
    role: 'generator_meter',
    modbusId: 5,
    capacityKw: 500,
  },
  {
    id: 'gen_4',
    label: 'Generator Meter 4',
    enabled: false,
    deviceType: 'none',
    role: 'generator_meter',
    modbusId: 6,
    capacityKw: 500,
  },
  {
    id: 'inv_1',
    label: 'Inverter 1',
    enabled: true,
    deviceType: 'huawei',
    role: 'inverter',
    modbusId: 10,
    capacityKw: 100,
  },
  {
    id: 'inv_2',
    label: 'Inverter 2',
    enabled: false,
    deviceType: 'none',
    role: 'inverter',
    modbusId: 11,
    capacityKw: 100,
  },
  {
    id: 'inv_3',
    label: 'Inverter 3',
    enabled: false,
    deviceType: 'none',
    role: 'inverter',
    modbusId: 12,
    capacityKw: 100,
  },
];

export const defaultSite: SiteConfig = {
  siteName: 'New Site',
  boardName: 'pv-dg-controller',
  boardIp: '192.168.1.50',
  wifiSsid: 'Rao',
  controllerMode: 'grid_zero_export',
  exportLimitKw: 0,
  importLimitKw: 0,
  pvRatedKw: 100,
  deadbandKw: 1,
  controlGain: 0.2,
  rampPctStep: 3,
  minPvPercent: 0,
  maxPvPercent: 100,
  slots: defaultSlots,
};
