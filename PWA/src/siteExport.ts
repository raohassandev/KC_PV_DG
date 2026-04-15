import { type SiteConfig } from './siteTemplates';

function quote(value: string) {
  return JSON.stringify(value);
}

export function generateSiteExport(config: SiteConfig): string {
  const slots = config.slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    enabled: slot.enabled,
    device_type: slot.deviceType,
    role: slot.role,
    modbus_id: slot.modbusId,
    capacity_kw: slot.capacityKw,
    ip_hint: slot.ipHint || null,
    notes: slot.notes || null,
  }));

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

board_contract:
  read_entities:
    grid:
      status: /text_sensor/Grid%20Meter%20Status
      frequency: /sensor/Grid%20Frequency
      total_active_power: /sensor/Grid%20Total%20Active%20Power
      total_power_factor: /sensor/Grid%20Total%20Power%20Factor
      import_energy: /sensor/Grid%20Import%20Energy
    inverter:
      status: /text_sensor/Inverter%20Status
      actual_power: /sensor/Inverter%20Actual%20Power
      pmax: /sensor/Inverter%20Pmax
    controller:
      state: /text_sensor/Controller%20State
  write_entities:
    controller_enable: /switch/Controller%20Enable
    grid_meter_enable: /switch/Enable%20Grid%20Meter
    inverter_enable: /switch/Enable%20Inverter
    inverter_write_enable: /switch/Write%20Commands%20To%20Inverter
    control_mode: /select/Control%20Mode
    pv_rated_kw: /number/PV%20Rated%20kW
    deadband_kw: /number/Deadband%20kW
    control_gain: /number/Control%20Gain
    export_limit_kw: /number/Export%20Limit%20kW
    import_limit_kw: /number/Import%20Limit%20kW
    ramp_pct_step: /number/Ramp%20pct%20Step
    min_pv_percent: /number/Min%20PV%20Percent
    max_pv_percent: /number/Max%20PV%20Percent

slots:
${slots
  .map(
    (slot) => `  - id: ${quote(slot.id)}
    label: ${quote(slot.label)}
    enabled: ${slot.enabled}
    device_type: ${quote(slot.device_type)}
    role: ${quote(slot.role)}
    modbus_id: ${slot.modbus_id}
    capacity_kw: ${slot.capacity_kw}
    ip_hint: ${slot.ip_hint === null ? 'null' : quote(slot.ip_hint)}
    notes: ${slot.notes === null ? 'null' : quote(slot.notes)}`,
  )
  .join('\n')}
`;
}
