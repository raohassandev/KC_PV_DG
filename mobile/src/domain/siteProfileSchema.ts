export type DeviceType =
  | 'none'
  | 'em500'
  | 'em500_v2'
  | 'em500_generator'
  | 'wm15'
  | 'kpm37'
  | 'iskra_mc3'
  | 'm4m'
  | 'gc_multiline'
  | 'huawei'
  | 'huawei_smartlogger'
  | 'sma'
  | 'solaredge'
  | 'growatt'
  | 'solax'
  | 'sungrow'
  | 'cps_chint'
  | 'knox_asw'
  | 'generic_modbus';

export type SourceRole = 'none' | 'grid_meter' | 'generator_meter' | 'inverter';

export type TopologyType =
  | 'SINGLE_BUS'
  | 'SINGLE_BUS_MULTI_GEN'
  | 'DUAL_BUS'
  | 'DUAL_BUS_SEPARATE'
  | 'DUAL_BUS_COMBINED';

export type GridOperatingMode = 'full_production' | 'export_setpoint' | 'zero_export';

export type FallbackMode = 'hold_last_safe' | 'reduce_to_safe_min' | 'manual_bypass';

export type SourceSlot = {
  id: string;
  label: string;
  enabled: boolean;
  deviceType: DeviceType;
  /**
   * Optional driver id from Manufacturer driver library.
   * When set, commissioning should prefer this over built-in `deviceType` templates.
   */
  driverId?: string;
  role: SourceRole;
  /**
   * Field transport expectation for this slot.
   * - rtu: RS485 Modbus RTU
   * - rs232: RS-232 Modbus RTU (same framing as RTU; different physical port on the board)
   * - tcp: Modbus TCP/IP (board/gateway LAN client; browser does not speak raw TCP)
   */
  transport?: 'rtu' | 'tcp' | 'rs232';
  modbusId: number;
  tcpHost?: string;
  tcpPort?: number;
  /** Serial (RTU / RS-232): baud. Default 9600. */
  serialBaud?: number;
  serialParity?: 'none' | 'even' | 'odd';
  serialStopBits?: 1 | 2;
  /** Modbus on serial uses 8 data bits; stored for controller configuration. */
  serialDataBits?: 8;
  /** RS-485 line termination / bias intent (ignored for RS-232 / TCP in firmware unless mapped). */
  rs485Termination?: 'auto' | 'on' | 'off';
  /** Modbus controller read cadence hint for this device (ms). */
  modbusPollIntervalMs?: number;
  /** Modbus request timeout hint for this device (ms). */
  modbusRequestTimeoutMs?: number;
  capacityKw: number;
  networkId?: string;
  busSide?: 'A' | 'B' | 'both';
  generatorType?: 'diesel' | 'gas';
  ipHint?: string;
  notes?: string;
};

export type SiteConfig = {
  siteName: string;
  boardName: string;
  boardIp: string;
  wifiSsid: string;
  customerName: string;
  timezone: string;
  /** High-level operating mode (root requirement). */
  controllerRuntimeMode: 'sync_controller' | 'dzx_virtual_meter';
  /** Selected profile for inverter command writes when in sync_controller mode. */
  syncProfileId: string;
  /** Selected profile for virtual-meter emulation when in dzx_virtual_meter mode. */
  dzxProfileId: string;
  topologyType: TopologyType;
  netMeteringEnabled: boolean;
  gridOperatingMode: GridOperatingMode;
  exportSetpointKw: number;
  zeroExportDeadbandKw: number;
  reverseMarginKw: number;
  rampUpPct: number;
  rampDownPct: number;
  fastDropPct: number;
  meterTimeoutSec: number;
  controlIntervalSec: number;
  generatorMinimumOverrideEnabled: boolean;
  dieselMinimumLoadPct: number;
  gasMinimumLoadPct: number;
  tieSignalPresent: boolean;
  fallbackMode: FallbackMode;
  controllerMode: 'disabled' | 'grid_zero_export' | 'grid_limited_export' | 'grid_limited_import';
  exportLimitKw: number;
  importLimitKw: number;
  pvRatedKw: number;
  deadbandKw: number;
  controlGain: number;
  rampPctStep: number;
  minPvPercent: number;
  maxPvPercent: number;
  /**
   * Traceability: built-in scenario template last applied from Site Setup.
   * Cleared when the engineer removes the label after heavy customization.
   */
  commissioningScenarioTemplateId?: string | null;
  slots: SourceSlot[];
};

const SLOT_ID_MIGRATIONS: Record<string, { from: number; to: number }> = {
  gen_1: { from: 3, to: 11 },
  gen_2: { from: 4, to: 12 },
  inv_1: { from: 10, to: 21 },
  inv_2: { from: 11, to: 22 },
  inv_3: { from: 12, to: 23 },
  inv_4: { from: 13, to: 24 },
  inv_5: { from: 14, to: 25 },
  inv_6: { from: 15, to: 26 },
  inv_7: { from: 16, to: 27 },
  inv_8: { from: 17, to: 28 },
  inv_9: { from: 18, to: 29 },
  inv_10: { from: 19, to: 30 },
};

export const defaultSite: SiteConfig = {
  siteName: '',
  boardName: '',
  boardIp: '',
  wifiSsid: '',
  customerName: '',
  timezone: 'Asia/Karachi',
  controllerRuntimeMode: 'sync_controller',
  syncProfileId: 'huawei-default',
  dzxProfileId: 'huawei-meter-v1',
  topologyType: 'SINGLE_BUS',
  netMeteringEnabled: true,
  gridOperatingMode: 'zero_export',
  exportSetpointKw: 0,
  zeroExportDeadbandKw: 1,
  reverseMarginKw: 2,
  rampUpPct: 3,
  rampDownPct: 10,
  fastDropPct: 25,
  meterTimeoutSec: 10,
  controlIntervalSec: 1,
  generatorMinimumOverrideEnabled: false,
  dieselMinimumLoadPct: 30,
  gasMinimumLoadPct: 50,
  tieSignalPresent: false,
  fallbackMode: 'reduce_to_safe_min',
  controllerMode: 'grid_zero_export',
  exportLimitKw: 0,
  importLimitKw: 0,
  pvRatedKw: 100,
  deadbandKw: 1,
  controlGain: 0.2,
  rampPctStep: 3,
  minPvPercent: 0,
  maxPvPercent: 100,
  slots: [],
};

/**
 * Rows appended when loading a persisted site that predates the empty `defaultSite.slots` default,
 * so commissioning still lists the full harness (e.g. inv_10 in advanced catalog).
 */
const COMMISSIONING_BACKFILL_STUBS: SourceSlot[] = [
  {
    id: 'gen_2',
    label: 'Generator Meter 2',
    enabled: false,
    deviceType: 'none',
    role: 'generator_meter',
    transport: 'rtu',
    modbusId: 12,
    tcpPort: 502,
    capacityKw: 500,
    networkId: 'main',
    busSide: 'A',
    generatorType: 'diesel',
  },
  {
    id: 'gen_3',
    label: 'Generator Meter 3',
    enabled: false,
    deviceType: 'none',
    role: 'generator_meter',
    transport: 'rtu',
    modbusId: 5,
    tcpPort: 502,
    capacityKw: 500,
    networkId: 'main',
    busSide: 'A',
    generatorType: 'diesel',
  },
  {
    id: 'inv_2',
    label: 'Inverter 2',
    enabled: false,
    deviceType: 'none',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 22,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_3',
    label: 'Inverter 3',
    enabled: false,
    deviceType: 'none',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 23,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_4',
    label: 'Inverter 4',
    enabled: false,
    deviceType: 'none',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 24,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_5',
    label: 'Inverter 5',
    enabled: false,
    deviceType: 'none',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 25,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_6',
    label: 'Inverter 6',
    enabled: false,
    deviceType: 'none',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 26,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_7',
    label: 'Inverter 7',
    enabled: false,
    deviceType: 'none',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 27,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_8',
    label: 'Inverter 8',
    enabled: false,
    deviceType: 'none',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 28,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_9',
    label: 'Inverter 9',
    enabled: false,
    deviceType: 'none',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 29,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
  {
    id: 'inv_10',
    label: 'Inverter 10',
    enabled: false,
    deviceType: 'none',
    role: 'inverter',
    transport: 'rtu',
    modbusId: 30,
    tcpPort: 502,
    capacityKw: 100,
    networkId: 'main',
    busSide: 'A',
  },
];

/** Modbus on serial: default 9600 N 8 1 */
export const DEFAULT_SLOT_LINK = {
  serialBaud: 9600,
  serialParity: 'none' as const,
  serialStopBits: 1 as const,
  serialDataBits: 8 as const,
  rs485Termination: 'auto' as const,
  modbusPollIntervalMs: 1000,
  modbusRequestTimeoutMs: 1200,
};

function clampInt(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, Math.trunc(v)));
}

export function applySlotLinkDefaults(slot: SourceSlot): SourceSlot {
  const transport: SourceSlot['transport'] =
    slot.transport === 'tcp' || slot.transport === 'rs232' ? slot.transport : 'rtu';

  const stop: 1 | 2 = slot.serialStopBits === 2 ? 2 : DEFAULT_SLOT_LINK.serialStopBits;
  const parity =
    slot.serialParity === 'even' || slot.serialParity === 'odd' || slot.serialParity === 'none'
      ? slot.serialParity
      : DEFAULT_SLOT_LINK.serialParity;
  const term =
    slot.rs485Termination === 'on' || slot.rs485Termination === 'off' || slot.rs485Termination === 'auto'
      ? slot.rs485Termination
      : DEFAULT_SLOT_LINK.rs485Termination;

  return {
    ...slot,
    transport,
    serialBaud: clampInt(slot.serialBaud ?? DEFAULT_SLOT_LINK.serialBaud, 300, 115200),
    serialParity: parity,
    serialStopBits: stop,
    serialDataBits: slot.serialDataBits === 8 ? 8 : DEFAULT_SLOT_LINK.serialDataBits,
    rs485Termination: term,
    modbusPollIntervalMs: clampInt(
      slot.modbusPollIntervalMs ?? DEFAULT_SLOT_LINK.modbusPollIntervalMs,
      250,
      60_000,
    ),
    modbusRequestTimeoutMs: clampInt(
      slot.modbusRequestTimeoutMs ?? DEFAULT_SLOT_LINK.modbusRequestTimeoutMs,
      200,
      10_000,
    ),
  };
}

export function formatSlotLinkSummary(slot: SourceSlot): string {
  const poll = slot.modbusPollIntervalMs ?? DEFAULT_SLOT_LINK.modbusPollIntervalMs;
  if (slot.transport === 'tcp') {
    const host = slot.tcpHost?.trim() || '—';
    const port = slot.tcpPort ?? 502;
    return `${host}:${port} · ${poll} ms poll`;
  }
  const baud = slot.serialBaud ?? DEFAULT_SLOT_LINK.serialBaud;
  const par =
    slot.serialParity === 'even' ? 'E' : slot.serialParity === 'odd' ? 'O' : 'N';
  const sb = slot.serialStopBits === 2 ? 2 : 1;
  const bus = slot.transport === 'rs232' ? 'RS-232' : 'RS-485';
  return `${bus} ${baud} ${par}8${sb} · ${poll} ms`;
}

function applySlotModbusMigration(slot: SourceSlot): SourceSlot {
  const mig = SLOT_ID_MIGRATIONS[slot.id];
  if (mig && slot.modbusId === mig.from) {
    return { ...slot, modbusId: mig.to };
  }
  return slot;
}

function finalizeSlot(slot: SourceSlot): SourceSlot {
  return applySlotLinkDefaults(applySlotModbusMigration(slot));
}

export function normalizeSiteConfig(input: SiteConfig): SiteConfig {
  const base = defaultSite;
  const merged: SiteConfig = { ...base, ...input };

  const byId = new Map<string, SourceSlot>();
  for (const slot of input.slots ?? []) byId.set(slot.id, slot);

  const nextSlots: SourceSlot[] = base.slots.map((slot) => {
    const existing = byId.get(slot.id);
    const mergedSlot: SourceSlot = existing ? ({ ...slot, ...existing } as SourceSlot) : slot;
    return finalizeSlot(mergedSlot);
  });

  // Preserve any unknown/custom slots at the end (future-proofing).
  for (const slot of input.slots ?? []) {
    if (!base.slots.some((s) => s.id === slot.id)) {
      nextSlots.push(finalizeSlot(slot as SourceSlot));
    }
  }

  merged.slots = nextSlots;

  if ((input.slots ?? []).length > 0) {
    const have = new Set(merged.slots.map((s) => s.id));
    for (const stub of COMMISSIONING_BACKFILL_STUBS) {
      if (!have.has(stub.id)) {
        merged.slots.push(finalizeSlot(stub));
        have.add(stub.id);
      }
    }
  }

  return merged;
}
