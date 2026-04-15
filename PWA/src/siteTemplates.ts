import {
  type SiteConfig,
  type SourceRole,
  type DeviceType,
  type SourceSlot,
  defaultSite as baseDefaultSite,
} from './siteProfileSchema';

export type { DeviceType, SourceRole, SourceSlot, SiteConfig } from './siteProfileSchema';

export type DeviceCatalogItem = {
  value: DeviceType;
  label: string;
  description: string;
  uiHint: string;
  roles: SourceRole[];
};

export const deviceCatalog: DeviceCatalogItem[] = [
  {
    value: 'none',
    label: 'Unused',
    description: 'Slot is reserved but not active.',
    uiHint: 'Use this for a placeholder slot.',
    roles: ['none', 'grid_meter', 'generator_meter', 'inverter'],
  },
  {
    value: 'em500',
    label: 'EM500 Meter',
    description: 'Current validated EM500 / Rozwell meter template.',
    uiHint: 'Use for grid metering in the lab configuration.',
    roles: ['grid_meter', 'generator_meter'],
  },
  {
    value: 'em500_v2',
    label: 'EM500 Meter v2',
    description: 'Future EM500 variant or alternative register mapping.',
    uiHint: 'Use when the meter model is EM500-compatible but not identical.',
    roles: ['grid_meter', 'generator_meter'],
  },
  {
    value: 'em500_generator',
    label: 'EM500 Generator Meter',
    description: 'EM500 template reused for generator metering roles.',
    uiHint: 'Use for generator-side meter roles on the same RS485 bus.',
    roles: ['generator_meter'],
  },
  {
    value: 'huawei',
    label: 'Huawei Inverter',
    description: 'Huawei inverter template with live read support only for now.',
    uiHint: 'Use for inverter slots that map to a Huawei device.',
    roles: ['inverter'],
  },
  {
    value: 'huawei_smartlogger',
    label: 'Huawei SmartLogger',
    description: 'Huawei SmartLogger or companion gateway profile.',
    uiHint: 'Use if the inverter data arrives through a Huawei gateway layer.',
    roles: ['inverter'],
  },
  {
    value: 'generic_modbus',
    label: 'Generic Modbus Device',
    description: 'Fallback profile for a new Modbus meter/inverter template.',
    uiHint: 'Use when you need a new custom device profile.',
    roles: ['grid_meter', 'generator_meter', 'inverter'],
  },
];

export const deviceOptions: Array<[DeviceType, string]> = deviceCatalog.map(
  (item) => [item.value, item.label],
);

export function deviceOptionsForRole(role: SourceRole): Array<[DeviceType, string]> {
  return deviceCatalog
    .filter((item) => item.roles.includes(role))
    .map((item) => [item.value, item.label]);
}

export const deviceHelp: Record<DeviceType, string> = Object.fromEntries(
  deviceCatalog.map((item) => [item.value, item.uiHint]),
) as Record<DeviceType, string>;

export const deviceDescriptions: Record<DeviceType, string> = Object.fromEntries(
  deviceCatalog.map((item) => [item.value, item.description]),
) as Record<DeviceType, string>;

export const deviceDetails: Record<DeviceType, DeviceCatalogItem> = Object.fromEntries(
  deviceCatalog.map((item) => [item.value, item]),
) as Record<DeviceType, DeviceCatalogItem>;

export const controllerModeHelp: Record<SiteConfig['controllerMode'], string> = {
  disabled: 'Monitoring only. No control output is applied.',
  grid_zero_export: 'Hold grid power near zero export.',
  grid_limited_export: 'Allow export only up to the configured limit.',
  grid_limited_import: 'Limit import to the configured positive threshold.',
};

export const roleHelp: Record<SourceRole, string> = {
  none: 'Slot is not active yet.',
  grid_meter: 'Use for the main plant grid meter.',
  generator_meter: 'Use for a generator-side energy meter.',
  inverter: 'Use for a PV inverter or inverter gateway role.',
};

export const controlFieldHelp = {
  pvRatedKw:
    'The inverter or PV capacity used to calculate control step size and clamp the command.',
  deadbandKw: 'Ignore small grid errors inside this band to reduce hunting.',
  controlGain: 'Multiplier that decides how aggressively the controller responds.',
  exportLimitKw: 'Maximum allowed export when limited export mode is active.',
  importLimitKw: 'Maximum allowed import when limited import mode is active.',
  rampPctStep: 'Maximum percent change applied per control cycle.',
  minPvPercent: 'Lower clamp for the commanded inverter percentage.',
  maxPvPercent: 'Upper clamp for the commanded inverter percentage.',
  controlLoop:
    'The board measures grid power, picks a target based on mode, applies deadband and gain, then clamps the PV command between the min and max percent.',
  inverterGate:
    'The inverter write switch is a safety gate. Keep it off until the site inverter path is validated.',
  exportSetpointKw:
    'Desired export/import target used when the grid policy operates in export setpoint mode.',
  zeroExportDeadbandKw:
    'Tolerance around zero export for site stability and hunting prevention.',
  reverseMarginKw:
    'Margin before generator reverse power risk triggers fast PV reduction.',
  rampUpPct:
    'Maximum allowed increase in inverter command per control interval.',
  rampDownPct:
    'Maximum allowed decrease in inverter command per control interval.',
  fastDropPct:
    'Emergency drop percentage used when generator protection is at risk.',
  meterTimeoutSec:
    'How long a meter can go stale before the controller enters fail-safe.',
  controlIntervalSec:
    'How often the control loop evaluates source status and updates PV target.',
} as const;

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
  ...baseDefaultSite,
  slots: defaultSlots,
};
