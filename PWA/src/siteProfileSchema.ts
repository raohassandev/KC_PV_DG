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
  role: SourceRole;
  /**
   * Field transport expectation for this slot.
   * - rtu: RS485/serial Modbus RTU (current production path)
   * - tcp: Modbus TCP/IP (board/gateway LAN client; browser does not speak raw TCP)
   */
  transport?: 'rtu' | 'tcp';
  modbusId: number;
  tcpHost?: string;
  tcpPort?: number;
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
  slots: SourceSlot[];
};

export const defaultSite: SiteConfig = {
  siteName: 'New Site',
  boardName: 'pv-dg-controller',
  boardIp: '192.168.0.111',
  wifiSsid: 'Rao',
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
  slots: [
    {
      id: 'grid_1',
      label: 'Grid Meter 1',
      enabled: true,
      deviceType: 'em500',
      role: 'grid_meter',
      transport: 'rtu',
      modbusId: 1,
      tcpPort: 502,
      capacityKw: 0,
      networkId: 'main',
      busSide: 'A',
    },
    {
      id: 'gen_1',
      label: 'Generator Meter 1',
      enabled: false,
      deviceType: 'none',
      role: 'generator_meter',
      transport: 'rtu',
      modbusId: 3,
      tcpPort: 502,
      capacityKw: 500,
      networkId: 'main',
      busSide: 'A',
      generatorType: 'diesel',
    },
    {
      id: 'gen_2',
      label: 'Generator Meter 2',
      enabled: false,
      deviceType: 'none',
      role: 'generator_meter',
      transport: 'rtu',
      modbusId: 4,
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
      id: 'inv_1',
      label: 'Inverter 1',
      enabled: true,
      deviceType: 'huawei',
      role: 'inverter',
      transport: 'rtu',
      modbusId: 10,
      tcpPort: 502,
      capacityKw: 100,
      networkId: 'main',
      busSide: 'A',
    },
  ],
};
