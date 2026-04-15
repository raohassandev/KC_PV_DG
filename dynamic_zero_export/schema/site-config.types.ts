export type TopologyType =
  | 'SINGLE_BUS'
  | 'SINGLE_BUS_MULTI_GEN'
  | 'DUAL_BUS'
  | 'DUAL_BUS_SEPARATE'
  | 'DUAL_BUS_COMBINED';

export type MeterTransport = 'rtu' | 'tcp';

export type VirtualMeterMode = 'pass_through' | 'adjusted' | 'safe_fallback';

export type GridMode = 'full_production' | 'export_setpoint' | 'zero_export';

export type FallbackMode = 'hold_last_safe' | 'reduce_to_safe_min' | 'manual_bypass';

export type GeneratorType = 'diesel' | 'gas';

export type SiteBasics = {
  name: string;
  customerName?: string;
  controllerId: string;
  timezone?: string;
  notes?: string;
};

export type TopologyConfig = {
  type: TopologyType;
  busCount: 1 | 2;
  tieSignalPresent: boolean;
};

export type MeterAddressing =
  | {
      slaveId: number;
      baud?: number;
      parity?: 'N' | 'E' | 'O';
      port?: number;
      ip?: never;
    }
  | {
      ip: string;
      port: number;
      slaveId?: number;
      baud?: never;
      parity?: never;
    };

export type MeterInputConfig = {
  transport: MeterTransport;
  brand: string;
  profileId: string;
  addressing: MeterAddressing;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

export type VirtualMeterConfig = {
  brand: string;
  profileId: string;
  mode: VirtualMeterMode;
  slaveId: number;
};

export type GeneratorConfig = {
  id: string;
  label: string;
  type: GeneratorType;
  ratingKw: number;
  runningSignal?: string;
  breakerSignal?: string;
  powerSignal?: string;
  networkId?: string;
  busSide?: 'A' | 'B' | 'both';
};

export type InverterGroupConfig = {
  id: string;
  label: string;
  brand: string;
  emulationProfileId: string;
  networkId?: string;
  busSide?: 'A' | 'B' | 'both';
  slaveId: number;
  serialPort?: string;
};

export type PolicyConfig = {
  netMeteringEnabled: boolean;
  gridMode: GridMode;
  exportSetpointKw: number;
  zeroExportDeadbandKw: number;
  dieselMinimumLoadPct: number;
  gasMinimumLoadPct: number;
  reverseMarginKw: number;
  rampUpPct: number;
  rampDownPct: number;
  fastDropPct: number;
  fallbackMode: FallbackMode;
};

export type SafetyConfig = {
  meterTimeoutSec: number;
  staleDataMode: 'freeze' | 'reduce' | 'alarm';
  manualOverrideEnabled: boolean;
};

export type MonitoringConfig = {
  enableWebUi: boolean;
  enableEventLog: boolean;
  publishDiagnostics: boolean;
};

export type DynamicZeroExportSiteConfig = {
  site: SiteBasics;
  topology: TopologyConfig;
  meterInput: MeterInputConfig;
  virtualMeter: VirtualMeterConfig;
  policy: PolicyConfig;
  safety: SafetyConfig;
  monitoring: MonitoringConfig;
  generators: GeneratorConfig[];
  inverterGroups: InverterGroupConfig[];
};

export const defaultDynamicZeroExportConfig: DynamicZeroExportSiteConfig = {
  site: {
    name: 'New Site',
    controllerId: 'dzx-001',
    timezone: 'Asia/Karachi',
    notes: '',
  },
  topology: {
    type: 'SINGLE_BUS',
    busCount: 1,
    tieSignalPresent: false,
  },
  meterInput: {
    transport: 'rtu',
    brand: 'generic-modbus',
    profileId: 'default-grid-meter',
    addressing: {
      slaveId: 1,
      baud: 9600,
      parity: 'N',
    },
    pollIntervalMs: 1000,
    timeoutMs: 2000,
  },
  virtualMeter: {
    brand: 'generic-modbus',
    profileId: 'default-virtual-meter',
    mode: 'adjusted',
    slaveId: 1,
  },
  policy: {
    netMeteringEnabled: true,
    gridMode: 'zero_export',
    exportSetpointKw: 0,
    zeroExportDeadbandKw: 1,
    dieselMinimumLoadPct: 30,
    gasMinimumLoadPct: 50,
    reverseMarginKw: 2,
    rampUpPct: 3,
    rampDownPct: 10,
    fastDropPct: 25,
    fallbackMode: 'reduce_to_safe_min',
  },
  safety: {
    meterTimeoutSec: 10,
    staleDataMode: 'reduce',
    manualOverrideEnabled: false,
  },
  monitoring: {
    enableWebUi: true,
    enableEventLog: true,
    publishDiagnostics: true,
  },
  generators: [
    {
      id: 'gen_1',
      label: 'Generator 1',
      type: 'diesel',
      ratingKw: 500,
      networkId: 'main',
      busSide: 'A',
    },
  ],
  inverterGroups: [
    {
      id: 'inv_1',
      label: 'Inverter Group 1',
      brand: 'huawei',
      emulationProfileId: 'huawei-default',
      networkId: 'main',
      busSide: 'A',
      slaveId: 1,
      serialPort: '/dev/ttyUSB0',
    },
  ],
};

