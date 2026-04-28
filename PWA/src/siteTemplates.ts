import {
  type SiteConfig,
  type SourceRole,
  type DeviceType,
  defaultSite as baseDefaultSite,
} from './siteProfileSchema';

export type { DeviceType, SourceRole, SourceSlot, SiteConfig } from './siteProfileSchema';
export {
  applySlotLinkDefaults,
  DEFAULT_SLOT_LINK,
  formatSlotLinkSummary,
  normalizeSiteConfig,
} from './siteProfileSchema';

export type DeviceCatalogItem = {
  value: DeviceType;
  label: string;
  description: string;
  uiHint: string;
  roles: SourceRole[];
  /** Repo-relative manual or register map (for commissioning traceability). */
  docPath?: string;
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
    docPath: 'docs/Energy Analyzer/EM500 Register Data-New (1).pdf',
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
    value: 'wm15',
    label: 'Carlo Gavazzi WM15',
    description:
      'Three-phase analyzer / energy meter. Register map in repo; firmware YAML not bundled until mapped like EM500.',
    uiHint:
      'Select when WM15 is on the RS485 bus. Requires a dedicated ESPHome meter package before deploy.',
    roles: ['grid_meter', 'generator_meter'],
    docPath: 'docs/Energy Analyzer/Mannual/Energy Analyzer/Carlo Gavazzi WM15 Rs-485 Registers.pdf',
  },
  {
    value: 'kpm37',
    label: 'KPM37 Rail Meter',
    description:
      'Three-phase rail-mount smart power meter (instruction manual + registers in repo).',
    uiHint: 'Use for sites with KPM37 as grid or sub-meter. Map registers before production.',
    roles: ['grid_meter', 'generator_meter'],
    docPath: 'docs/Energy Analyzer/KPM37-Three-Phase-Rail-Smart-Power-Meter-instruction-Manual-V4.4-2025.3.pdf',
  },
  {
    value: 'iskra_mc3',
    label: 'Iskra MC3x0x',
    description: 'Iskra MC3 series analyzer / meter per user manual in repo.',
    uiHint: 'Assign to grid or generator metering slot; validate decode on bench.',
    roles: ['grid_meter', 'generator_meter'],
    docPath: 'docs/Energy Analyzer/Iskra. K_MC3x0x_GB_22444000_Usersmanual_Ver_8.00.pdf',
  },
  {
    value: 'm4m',
    label: 'M4M (Modbus map)',
    description: 'M4M energy device with spreadsheet Modbus map in repo.',
    uiHint: 'Use when site standardizes on M4M; import map into firmware template.',
    roles: ['grid_meter', 'generator_meter'],
    docPath: 'docs/Energy Analyzer/M4M Modbus map - v.1.3N.xlsx',
  },
  {
    value: 'gc_multiline',
    label: 'GC / DST4602 multiline',
    description: 'Carlo Gavazzi GC400–600 / DST4602 / MC family manual in repo.',
    uiHint: 'For multiline panel analyzers on the bus; map holding/input registers per manual.',
    roles: ['grid_meter', 'generator_meter'],
    docPath:
      'docs/Energy Analyzer/Mannual/Energy Analyzer/GC400-GC500-GC600-DST4602-MC100MC200-BTB200-BTB100.pdf',
  },
  {
    value: 'huawei',
    label: 'Huawei Inverter',
    description: 'Huawei inverter template with live read support only for now.',
    uiHint: 'Use for inverter slots that map to a Huawei device.',
    roles: ['inverter'],
    docPath: 'docs/Inverter/Huawei/Huawei Inverter Modbus Interface Definitions (V3.0).pdf',
  },
  {
    value: 'huawei_smartlogger',
    label: 'Huawei SmartLogger',
    description: 'Huawei SmartLogger or companion gateway profile.',
    uiHint: 'Use if the inverter data arrives through a Huawei gateway layer.',
    roles: ['inverter'],
    docPath: 'docs/Inverter/Huawei/SmartLogger ModBus Interface Definitions.pdf',
  },
  {
    value: 'sma',
    label: 'SMA Inverter',
    description: 'SMA Modbus / SunSpec documentation set in repo (site-specific mapping required).',
    uiHint: 'Catalog entry for SMA; inverter YAML and entity map still site-specific.',
    roles: ['inverter'],
    docPath: 'docs/Inverter/SMA/SMA-Modbus-general-TI-en-10.pdf',
  },
  {
    value: 'solaredge',
    label: 'SolarEdge Inverter',
    description: 'SolarEdge / TerraMax Modbus interface technical note in repo.',
    uiHint: 'Select for SolarEdge; follow SunSpec / vendor note for register blocks.',
    roles: ['inverter'],
    docPath:
      'docs/Inverter/Solar edge/se-modbus-interface-for-solaredge-terramax-inverter-technical-note.pdf',
  },
  {
    value: 'growatt',
    label: 'Growatt Inverter',
    description: 'Growatt Modbus protocol PDF in repo.',
    uiHint: 'Use for Growatt PV inverters; validate ID and block addresses on site.',
    roles: ['inverter'],
    docPath: 'docs/Inverter/GROWATT.pdf',
  },
  {
    value: 'solax',
    label: 'Solax Inverter',
    description: 'Solax Hybrid X1/X3 G4 Modbus RTU/TCP manual in repo.',
    uiHint: 'Use for Solax hybrid/string inverters per published map.',
    roles: ['inverter'],
    docPath: 'docs/Inverter/Solax/Hybrid-X1X3-G4-ModbusTCPRTU-V321-English_0622-pub_240818_001120.pdf',
  },
  {
    value: 'sungrow',
    label: 'Sungrow Inverter',
    description: 'Sungrow Modbus protocol reference in repo.',
    uiHint: 'Use for Sungrow; confirm model-specific offsets before enabling writes.',
    roles: ['inverter'],
    docPath: 'docs/Inverter/Sungrow .pdf',
  },
  {
    value: 'cps_chint',
    label: 'Chint / CPS (CPS-SCH)',
    description: 'Chint CPS large string inverter Modbus map spec in repo.',
    uiHint: 'Use for CPS SCH series (e.g. 100–125 kW maps); align FW version to PDF.',
    roles: ['inverter'],
    docPath: 'docs/Inverter/Chint/CPS_100_125kW-UL-Modbus-Map-Spec-FW-V120_240817_221331.pdf',
  },
  {
    value: 'knox_asw',
    label: 'Knox / ASW (LT-G2)',
    description: 'ASW LT-G2 series Modbus documentation in repo.',
    uiHint: 'Use for Knox / ASW inverters; map per MB001 / series PDF.',
    roles: ['inverter'],
    docPath: 'docs/Inverter/Knox/MB001_ASW GEN-Modbus-en_V2.1.5(2).pdf',
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

export const controllerRuntimeModeHelp: Record<SiteConfig['controllerRuntimeMode'], string> = {
  sync_controller:
    'PV-DG Sync Controller: board reads meters (RTU/TCP) and writes power limits to inverter(s).',
  dzx_virtual_meter:
    'Dynamic Zero Export (DZX): board serves inverter as a meter (virtual meter). Inverter self-curtails using its own zero-export logic.',
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

export const defaultSite: SiteConfig = {
  ...baseDefaultSite,
};
