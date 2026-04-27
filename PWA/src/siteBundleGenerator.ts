import { type SiteConfig } from './siteProfileSchema';
import { inverterDeviceHasBundledYaml, meterDeviceHasBundledYaml } from './deviceFirmware';
import { deviceCatalog, deviceOptionsForRole } from './siteTemplates';
import { deriveZones, policyWarnings } from './policySchema';
import { readCachedDriver } from './driverCache';
import type { DriverDefinition } from './types/driverLibrary';

export type SiteBundleFile = {
  name: string;
  content: string;
};

function quote(value: string) {
  return JSON.stringify(value);
}

function enabledPackages(config: SiteConfig) {
  const enabledDevices = new Set(
    config.slots
      .filter((slot) => slot.enabled && slot.deviceType !== 'none')
      .map((slot) => slot.deviceType),
  );
  const needsTcp = config.slots.some((slot) => slot.enabled && slot.transport === 'tcp');

  const firstGrid = config.slots.find((s) => s.enabled && s.role === 'grid_meter');
  const firstInverter = config.slots.find((s) => s.enabled && s.role === 'inverter');
  const gridDriverId = firstGrid?.driverId?.trim() || '';
  const inverterDriverId = firstInverter?.driverId?.trim() || '';

  return [
    // Keep RTU (RS485) base as default. TCP is added as an optional package so RTU+TCP can coexist.
    'base_board: !include ../Modular_Yaml/base_board.yaml',
    ...(needsTcp
      ? ['modbus_tcp: !include ../Modular_Yaml/modbus_tcp_manager.yaml']
      : []),
    'io_board: !include ../Modular_Yaml/io_board.yaml',
    'service_ui: !include ../Modular_Yaml/service_ui.yaml',
    ...(gridDriverId
      ? [`meter_driver: !include drivers/${gridDriverId}.yaml`]
      : ['meter_em500_grid: !include ../Modular_Yaml/meter_em500_grid.yaml']),
    'control_core: !include ../Modular_Yaml/control_core.yaml',
    'display_oled: !include ../Modular_Yaml/display_oled.yaml',
    ...(inverterDriverId
      ? [`inverter_driver: !include drivers/${inverterDriverId}.yaml`]
      : enabledDevices.has('huawei') || enabledDevices.has('huawei_smartlogger')
        ? ['inverter_huawei: !include ../Modular_Yaml/inverter_huawei.yaml']
        : []),
  ];
}

function driverValueType(r: DriverDefinition['registers'][number]): string {
  // If a full byte order is specified (not ABCD), we will decode it via `lambda:`
  // and keep `value_type` in its normal (non _R) form.
  if (r.byteOrder && r.byteOrder !== 'ABCD') {
    return r.valueKind;
  }
  const kind = r.valueKind;
  const wordSwap = r.wordOrder === 'lowWordFirst';
  if (kind === 'U_DWORD') return wordSwap ? 'U_DWORD_R' : 'U_DWORD';
  if (kind === 'S_DWORD') return wordSwap ? 'S_DWORD_R' : 'S_DWORD';
  if (kind === 'U_QWORD') return wordSwap ? 'U_QWORD_R' : 'U_QWORD';
  if (kind === 'S_QWORD') return wordSwap ? 'S_QWORD_R' : 'S_QWORD';
  if (kind === 'FP32') return wordSwap ? 'FP32_R' : 'FP32';
  return kind;
}

function byteOrderIndexes(order: NonNullable<DriverDefinition['registers'][number]['byteOrder']>): number[] {
  if (order === 'ABCD') return [0, 1, 2, 3];
  if (order === 'BADC') return [1, 0, 3, 2];
  if (order === 'CDAB') return [2, 3, 0, 1];
  return [3, 2, 1, 0]; // DCBA
}

function needsByteLambda(r: DriverDefinition['registers'][number]): boolean {
  // For 16-bit values, byte order is rarely meaningful in Modbus context; ignore.
  if (r.valueKind === 'U_WORD' || r.valueKind === 'S_WORD') return false;
  return !!r.byteOrder && r.byteOrder !== 'ABCD';
}

function lambdaForByteOrder(r: DriverDefinition['registers'][number]): string {
  const idx = byteOrderIndexes(r.byteOrder ?? 'ABCD');
  const nBytes = r.valueKind === 'U_QWORD' || r.valueKind === 'S_QWORD' ? 8 : 4;
  const idxList =
    nBytes === 8
      ? [...idx.map((i) => i), ...idx.map((i) => i + 4)]
      : idx;

  const lines: string[] = [];
  lines.push(`|-`);
  lines.push(`  const size_t o = item->offset;`);
  lines.push(`  if (data.size() < o + ${nBytes}) return NAN;`);
  for (let i = 0; i < nBytes; i++) {
    lines.push(`  const uint8_t b${i} = data[o + ${idxList[i]}];`);
  }

  if (nBytes === 4) {
    lines.push(`  const uint32_t u = (uint32_t(b0) << 24) | (uint32_t(b1) << 16) | (uint32_t(b2) << 8) | uint32_t(b3);`);
    if (r.valueKind === 'FP32') {
      lines.push(`  float f = NAN;`);
      lines.push(`  memcpy(&f, &u, sizeof(float));`);
      lines.push(`  return f;`);
    } else if (r.valueKind === 'S_DWORD') {
      lines.push(`  const int32_t s = int32_t(u);`);
      lines.push(`  return float(s);`);
    } else {
      // U_DWORD
      lines.push(`  return float(u);`);
    }
  } else {
    // 64-bit: note this will lose precision above 2^24 in a float sensor, but is acceptable for UI-derived values.
    lines.push(`  const uint64_t u =`);
    lines.push(`    (uint64_t(b0) << 56) | (uint64_t(b1) << 48) | (uint64_t(b2) << 40) | (uint64_t(b3) << 32) |`);
    lines.push(`    (uint64_t(b4) << 24) | (uint64_t(b5) << 16) | (uint64_t(b6) << 8) | uint64_t(b7);`);
    if (r.valueKind === 'S_QWORD') {
      lines.push(`  const int64_t s = int64_t(u);`);
      lines.push(`  return float(double(s));`);
    } else {
      // U_QWORD
      lines.push(`  return float(double(u));`);
    }
  }
  return lines.join('\n');
}

function driverYaml(def: DriverDefinition, modbusControllerId: string): string {
  const out: string[] = [];
  const sensorLines: string[] = [];
  const textLines: string[] = [];

  sensorLines.push('sensor:');
  for (const r of def.registers ?? []) {
    if (r.enabled === false) continue;
    const addr = Number(r.address);
    if (!Number.isFinite(addr) || addr < 0) continue;
    if (r.valueKind === 'STRING') {
      const words = Math.max(1, Math.min(64, Math.trunc(r.stringLengthWords ?? 10)));
      if (textLines.length === 0) textLines.push('text_sensor:');
      textLines.push(`  - platform: modbus_controller`);
      textLines.push(`    modbus_controller_id: ${modbusControllerId}`);
      textLines.push(`    name: ${quote(r.label || r.paramKey)}`);
      textLines.push(`    address: 0x${Math.trunc(addr).toString(16).toUpperCase()}`);
      textLines.push(`    register_type: ${r.registerType}`);
      textLines.push(`    register_count: ${words}`);
      textLines.push(`    response_size: ${words * 2}`);
      textLines.push(`    raw_encode: ANSI`);
      continue;
    }

    sensorLines.push(`  - platform: modbus_controller`);
    sensorLines.push(`    modbus_controller_id: ${modbusControllerId}`);
    sensorLines.push(`    name: ${quote(r.label || r.paramKey)}`);
    sensorLines.push(`    address: 0x${Math.trunc(addr).toString(16).toUpperCase()}`);
    sensorLines.push(`    register_type: ${r.registerType}`);
    sensorLines.push(`    value_type: ${driverValueType(r)}`);
    if (needsByteLambda(r)) {
      sensorLines.push(`    lambda: ${lambdaForByteOrder(r)}`);
    }
    if (typeof r.precision === 'number' && Number.isFinite(r.precision)) {
      sensorLines.push(`    accuracy_decimals: ${Math.max(0, Math.min(6, Math.trunc(r.precision)))}`);
    }
    if (typeof r.scale === 'number' && Number.isFinite(r.scale) && r.scale !== 1) {
      sensorLines.push(`    filters:`);
      sensorLines.push(`      - multiply: ${r.scale}`);
    }
  }
  out.push(...sensorLines);
  if (textLines.length > 0) {
    out.push('');
    out.push(...textLines);
  }
  out.push('');
  return out.join('\n');
}

function slotSummary(config: SiteConfig) {
  return config.slots
    .map(
      (slot) => `  - id: ${quote(slot.id)}
    label: ${quote(slot.label)}
    enabled: ${slot.enabled}
    device_type: ${quote(slot.deviceType)}
    role: ${quote(slot.role)}
    transport: ${quote(slot.transport || 'rtu')}
    modbus_id: ${slot.modbusId}
    tcp_host: ${slot.tcpHost ? quote(slot.tcpHost) : 'null'}
    tcp_port: ${slot.tcpPort ?? 502}
    capacity_kw: ${slot.capacityKw}
    network_id: ${slot.networkId ? quote(slot.networkId) : 'null'}
    bus_side: ${slot.busSide ? quote(slot.busSide) : 'null'}
    generator_type: ${slot.generatorType ? quote(slot.generatorType) : 'null'}
    ip_hint: ${slot.ipHint ? quote(slot.ipHint) : 'null'}
    notes: ${slot.notes ? quote(slot.notes) : 'null'}`,
    )
    .join('\n');
}

function sourceAndInverterBlocks(config: SiteConfig) {
  const sources = config.slots.filter((slot) => slot.enabled && slot.role !== 'none');
  const gridSlots = sources.filter((slot) => slot.role === 'grid_meter');
  const generatorSlots = sources.filter((slot) => slot.role === 'generator_meter');
  const inverterSlots = sources.filter((slot) => slot.role === 'inverter');

  return `sources:
  grid_meters:
${gridSlots
  .map(
    (slot) => `    - id: ${quote(slot.id)}
      label: ${quote(slot.label)}
      transport: ${quote(slot.transport || 'rtu')}
      modbus_id: ${slot.modbusId}
      tcp_host: ${slot.tcpHost ? quote(slot.tcpHost) : 'null'}
      tcp_port: ${slot.tcpPort ?? 502}
      device_type: ${quote(slot.deviceType)}
      capacity_kw: ${slot.capacityKw}
      network_id: ${slot.networkId ? quote(slot.networkId) : 'null'}
      bus_side: ${slot.busSide ? quote(slot.busSide) : 'null'}`,
  )
  .join('\n')}
  generator_meters:
${generatorSlots
  .map(
    (slot) => `    - id: ${quote(slot.id)}
      label: ${quote(slot.label)}
      transport: ${quote(slot.transport || 'rtu')}
      modbus_id: ${slot.modbusId}
      tcp_host: ${slot.tcpHost ? quote(slot.tcpHost) : 'null'}
      tcp_port: ${slot.tcpPort ?? 502}
      device_type: ${quote(slot.deviceType)}
      capacity_kw: ${slot.capacityKw}
      network_id: ${slot.networkId ? quote(slot.networkId) : 'null'}
      bus_side: ${slot.busSide ? quote(slot.busSide) : 'null'}
      generator_type: ${slot.generatorType ? quote(slot.generatorType) : 'null'}`,
  )
  .join('\n')}

inverter_groups:
${inverterSlots
  .map(
    (slot) => `  - id: ${quote(slot.id)}
    label: ${quote(slot.label)}
    transport: ${quote(slot.transport || 'rtu')}
    modbus_id: ${slot.modbusId}
    tcp_host: ${slot.tcpHost ? quote(slot.tcpHost) : 'null'}
    tcp_port: ${slot.tcpPort ?? 502}
    device_type: ${quote(slot.deviceType)}
    rated_kw: ${slot.capacityKw}
    network_id: ${slot.networkId ? quote(slot.networkId) : 'null'}
    bus_side: ${slot.busSide ? quote(slot.busSide) : 'null'}`,
  )
  .join('\n')}`;
}

function zonePolicyBlock(config: SiteConfig) {
  const zones = deriveZones(config);
  return `derived_zones:
${zones
  .map(
    (zone) => `  - id: ${quote(zone.id)}
    summary: ${quote(zone.summary)}
    active_source_policy: ${quote(config.gridOperatingMode)}
    fallback_mode: ${quote(config.fallbackMode)}`,
  )
  .join('\n')}`;
}

function slotFirmwareStatus(config: SiteConfig) {
  const lines = config.slots
    .filter((slot) => slot.enabled && slot.deviceType !== 'none')
    .map((slot) => {
      const yaml =
        slot.role === 'inverter'
          ? inverterDeviceHasBundledYaml(slot.deviceType)
          : slot.role === 'grid_meter' || slot.role === 'generator_meter'
            ? meterDeviceHasBundledYaml(slot.deviceType)
            : false;
      return `  - slot_id: ${quote(slot.id)}
    role: ${quote(slot.role)}
    device_type: ${quote(slot.deviceType)}
    bundled_modular_yaml: ${yaml}`;
    });
  if (lines.length === 0) {
    return '  []';
  }
  return lines.join('\n');
}

function validationBlock(config: SiteConfig) {
  const topologySummary =
    config.topologyType === 'DUAL_BUS_COMBINED'
      ? 'combined'
      : config.topologyType === 'DUAL_BUS_SEPARATE'
        ? 'separate'
        : config.topologyType.startsWith('DUAL_BUS')
          ? 'derived'
          : 'single';

  return `validation:
  warnings:
${policyWarnings(config)
  .map((warning) => `    - ${quote(warning)}`)
  .join('\n')}
  topology_type: ${quote(config.topologyType)}
  tie_signal_present: ${config.tieSignalPresent}
  generator_override_enabled: ${config.generatorMinimumOverrideEnabled}
  network_count: ${new Set(
    config.slots.filter((slot) => slot.enabled).map((slot) => slot.networkId || 'main'),
  ).size}
  dual_bus_state: ${quote(topologySummary)}
`;
}

function manifestYaml(config: SiteConfig): string {
  const packages = enabledPackages(config);
  const needsTcp = config.slots.some((slot) => slot.enabled && slot.transport === 'tcp');
  const firstTcp = config.slots.find((slot) => slot.enabled && slot.transport === 'tcp');

  return `substitutions:
  devicename: ${quote(config.boardName)}
  friendly_name: ${quote(config.siteName)}
${needsTcp ? `  modbus_tcp_host: ${quote(firstTcp?.tcpHost?.trim() || '192.168.0.10')}
  modbus_tcp_port: ${String(firstTcp?.tcpPort ?? 502)}` : ''}

packages:
${packages.map((line) => `  ${line}`).join('\n')}
`;
}

function configYaml(config: SiteConfig): string {
  return `site:
  name: ${quote(config.siteName)}
  board_name: ${quote(config.boardName)}
  board_ip: ${quote(config.boardIp)}
  wifi_ssid: ${quote(config.wifiSsid)}
  customer_name: ${quote(config.customerName)}
  timezone: ${quote(config.timezone)}
  controller_runtime_mode: ${quote(config.controllerRuntimeMode)}
  sync_profile_id: ${quote(config.syncProfileId)}
  dzx_profile_id: ${quote(config.dzxProfileId)}
${config.commissioningScenarioTemplateId ? `  commissioning_scenario_template_id: ${quote(config.commissioningScenarioTemplateId)}\n` : ''}
topology:
  type: ${config.topologyType}
  tie_signal_present: ${config.tieSignalPresent}

policy:
  net_metering_enabled: ${config.netMeteringEnabled}
  grid_operating_mode: ${config.gridOperatingMode}
  export_setpoint_kw: ${config.exportSetpointKw}
  zero_export_deadband_kw: ${config.zeroExportDeadbandKw}
  reverse_margin_kw: ${config.reverseMarginKw}
  ramp_up_pct: ${config.rampUpPct}
  ramp_down_pct: ${config.rampDownPct}
  fast_drop_pct: ${config.fastDropPct}
  meter_timeout_sec: ${config.meterTimeoutSec}
  control_interval_sec: ${config.controlIntervalSec}
  generator_minimum_override_enabled: ${config.generatorMinimumOverrideEnabled}
  diesel_minimum_load_pct: ${config.dieselMinimumLoadPct}
  gas_minimum_load_pct: ${config.gasMinimumLoadPct}
  fallback_mode: ${config.fallbackMode}

device_catalog:
${deviceCatalog
  .map(
    (item) => `  - value: ${quote(item.value)}
    label: ${quote(item.label)}
    description: ${quote(item.description)}
    ui_hint: ${quote(item.uiHint)}
    roles: [${item.roles.map((role) => quote(role)).join(', ')}]${item.docPath ? `\n    doc_path: ${quote(item.docPath)}` : ''}`,
  )
  .join('\n')}

slot_firmware_bundles:
${slotFirmwareStatus(config)}

role_device_options:
  grid_meter: [${deviceOptionsForRole('grid_meter')
    .map(([value]) => quote(value))
    .join(', ')}]
  generator_meter: [${deviceOptionsForRole('generator_meter')
    .map(([value]) => quote(value))
    .join(', ')}]
  inverter: [${deviceOptionsForRole('inverter')
    .map(([value]) => quote(value))
    .join(', ')}]

controller:
  mode: ${config.controllerMode}
  pv_rated_kw: ${config.pvRatedKw}
  deadband_kw: ${config.deadbandKw}
  control_gain: ${config.controlGain}
  export_limit_kw: ${config.exportLimitKw}
  import_limit_kw: ${config.importLimitKw}
  ramp_pct_step: ${config.rampPctStep}
  min_pv_percent: ${config.minPvPercent}
  max_pv_percent: ${config.maxPvPercent}

slots:
${slotSummary(config)}

${sourceAndInverterBlocks(config)}

${zonePolicyBlock(config)}

${validationBlock(config)}
`;
}

function contractYaml(): string {
  return `web_ui:
  supported: true
  transport: esphome_web_server_v3
  groups:
    - Dashboard (board + plant snapshot)
    - Control
    - Grid Meter
    - Huawei Inverter
    - Energy
    - Service
    - I/O
    - Debug

board_contract:
  read:
    - name: Grid Meter Status
      path: /text_sensor/Grid%20Meter%20Status
    - name: Grid Frequency
      path: /sensor/Grid%20Frequency
    - name: Grid Total Active Power
      path: /sensor/Grid%20Total%20Active%20Power
    - name: Grid Total Power Factor
      path: /sensor/Grid%20Total%20Power%20Factor
    - name: Grid Import Energy
      path: /sensor/Grid%20Import%20Energy
    - name: Controller State
      path: /text_sensor/Controller%20State
    - name: Inverter Status
      path: /text_sensor/Inverter%20Status
    - name: Inverter Actual Power
      path: /sensor/Inverter%20Actual%20Power
    - name: Inverter Pmax
      path: /sensor/Inverter%20Pmax
  write:
    - name: Controller Enable
      path: /switch/Controller%20Enable
    - name: Enable Grid Meter
      path: /switch/Enable%20Grid%20Meter
    - name: Enable Inverter
      path: /switch/Enable%20Inverter
    - name: Write Commands To Inverter
      path: /switch/Write%20Commands%20To%20Inverter
    - name: Control Mode
      path: /select/Control%20Mode
    - name: PV Rated kW
      path: /number/PV%20Rated%20kW
    - name: Deadband kW
      path: /number/Deadband%20kW
    - name: Control Gain
      path: /number/Control%20Gain
    - name: Export Limit kW
      path: /number/Export%20Limit%20kW
    - name: Import Limit kW
      path: /number/Import%20Limit%20kW
    - name: Ramp pct Step
      path: /number/Ramp%20pct%20Step
    - name: Min PV Percent
      path: /number/Min%20PV%20Percent
    - name: Max PV Percent
      path: /number/Max%20PV%20Percent
`;
}

function commissioningYaml(config: SiteConfig): string {
  const zones = deriveZones(config);
  const warnings = policyWarnings(config);

  return `commissioning:
  site: ${quote(config.siteName)}
  customer: ${quote(config.customerName)}
  topology: ${quote(config.topologyType)}
  profile_mode: ${quote(config.gridOperatingMode)}

zones:
${zones
  .map(
    (zone) => `  - id: ${quote(zone.id)}
    summary: ${quote(zone.summary)}`,
  )
  .join('\n')}

warnings:
${warnings.length > 0 ? warnings.map((w) => `  - ${quote(w)}`).join('\n') : '  - "None"'}
`;
}

export function generateSiteBundle(config: SiteConfig): SiteBundleFile[] {
  const firstGrid = config.slots.find((s) => s.enabled && s.role === 'grid_meter');
  const firstInverter = config.slots.find((s) => s.enabled && s.role === 'inverter');
  const gridDriverId = firstGrid?.driverId?.trim() || '';
  const inverterDriverId = firstInverter?.driverId?.trim() || '';
  const gridDriver = gridDriverId ? readCachedDriver(gridDriverId) : null;
  const inverterDriver = inverterDriverId ? readCachedDriver(inverterDriverId) : null;

  const driverFiles: SiteBundleFile[] = [];
  if (gridDriver) driverFiles.push({ name: `drivers/${gridDriver.id}.yaml`, content: driverYaml(gridDriver, 'grid_meter') });
  if (inverterDriver) driverFiles.push({ name: `drivers/${inverterDriver.id}.yaml`, content: driverYaml(inverterDriver, 'solar_inverter') });

  const driverWarnings: string[] = [];
  if (gridDriverId && !gridDriver) driverWarnings.push(`Grid meter driver not cached: ${gridDriverId}`);
  if (inverterDriverId && !inverterDriver) driverWarnings.push(`Inverter driver not cached: ${inverterDriverId}`);

  return [
    { name: 'pv-dg-controller.generated.yaml', content: manifestYaml(config) },
    { name: 'site.config.yaml', content: configYaml(config) },
    { name: 'site.contract.yaml', content: contractYaml() },
    {
      name: 'commissioning.summary.yaml',
      content: commissioningYaml(config) + (driverWarnings.length ? `\n# driver_warnings:\n${driverWarnings.map((w) => `# - ${w}`).join('\n')}\n` : ''),
    },
    ...driverFiles,
  ];
}

/** Download merged site bundle as a single text file (browser only). */
export function downloadSiteBundle(files: SiteBundleFile[], siteName: string) {
  const payload = files
    .map((file) => `--- ${file.name} ---\n${file.content}`)
    .join('\n');
  const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${siteName.replace(/\s+/g, '_').toLowerCase()}_site_bundle.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
