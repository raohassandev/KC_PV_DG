import { type SiteConfig } from './siteTemplates';

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

  return [
    'base_board: !include ../Modular_Yaml/base_board.yaml',
    'io_board: !include ../Modular_Yaml/io_board.yaml',
    'service_ui: !include ../Modular_Yaml/service_ui.yaml',
    'meter_em500_grid: !include ../Modular_Yaml/meter_em500_grid.yaml',
    'control_core: !include ../Modular_Yaml/control_core.yaml',
    'display_oled: !include ../Modular_Yaml/display_oled.yaml',
    ...(enabledDevices.has('huawei')
      ? ['inverter_huawei: !include ../Modular_Yaml/inverter_huawei.yaml']
      : []),
  ];
}

function slotSummary(config: SiteConfig) {
  return config.slots
    .map(
      (slot) => `  - id: ${quote(slot.id)}
    label: ${quote(slot.label)}
    enabled: ${slot.enabled}
    device_type: ${quote(slot.deviceType)}
    role: ${quote(slot.role)}
    modbus_id: ${slot.modbusId}
    capacity_kw: ${slot.capacityKw}
    ip_hint: ${slot.ipHint ? quote(slot.ipHint) : 'null'}
    notes: ${slot.notes ? quote(slot.notes) : 'null'}`,
    )
    .join('\n');
}

function manifestYaml(config: SiteConfig): string {
  const packages = enabledPackages(config);

  return `substitutions:
  devicename: ${quote(config.boardName)}
  friendly_name: ${quote(config.siteName)}

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
`;
}

function contractYaml(): string {
  return `web_ui:
  supported: true
  transport: esphome_web_server_v3
  groups:
    - Overview
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

export function generateSiteBundle(config: SiteConfig): SiteBundleFile[] {
  return [
    { name: 'pv-dg-controller.generated.yaml', content: manifestYaml(config) },
    { name: 'site.config.yaml', content: configYaml(config) },
    { name: 'site.contract.yaml', content: contractYaml() },
  ];
}
