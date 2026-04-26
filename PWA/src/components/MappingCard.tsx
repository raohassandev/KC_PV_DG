import { NumberField, SelectField, TextField, ToggleField } from './commissioningFields';
import {
  type DeviceType,
  type SourceRole,
  type SourceSlot,
  deviceHelp,
  deviceOptionsForRole,
  roleHelp,
} from '../siteTemplates';
import type { DriverMeta } from '../types/driverLibrary';

const templateHelp: Record<DeviceType, string> = {
  none: 'Unused slot',
  em500: 'Validated EM500 / Rozwell meter template',
  em500_v2: 'EM500-compatible meter with alternate mapping',
  em500_generator: 'EM500 profile reused for generator metering',
  wm15: 'Carlo Gavazzi WM15 — manual in docs/Energy Analyzer/',
  kpm37: 'KPM37 rail meter — manual in docs/Energy Analyzer/',
  iskra_mc3: 'Iskra MC3 series — manual in docs/Energy Analyzer/',
  m4m: 'M4M Modbus map spreadsheet in docs/Energy Analyzer/',
  gc_multiline: 'GC / DST4602 multiline family — manual in docs/Energy Analyzer/',
  huawei: 'Huawei inverter template, read path only for now',
  huawei_smartlogger: 'Huawei gateway or SmartLogger profile',
  sma: 'SMA — Modbus/SunSpec docs in docs/Inverter/SMA/',
  solaredge: 'SolarEdge — interface note in docs/Inverter/Solar edge/',
  growatt: 'Growatt — protocol PDF in docs/Inverter/',
  solax: 'Solax Hybrid G4 — Modbus doc in docs/Inverter/Solax/',
  sungrow: 'Sungrow — protocol PDF in docs/Inverter/',
  cps_chint: 'Chint / CPS SCH — Modbus map in docs/Inverter/Chint/',
  knox_asw: 'Knox / ASW LT-G2 — MB001 doc in docs/Inverter/Knox/',
  generic_modbus: 'Fallback profile for a new Modbus device',
};

function slotSummaryHelp(slot: SourceSlot) {
  if (!slot.enabled) return 'Slot is disabled.';
  if (slot.role === 'grid_meter') return 'Primary grid metering slot.';
  if (slot.role === 'generator_meter') return 'Generator metering slot.';
  if (slot.role === 'inverter') return 'Inverter role slot.';
  return 'Commissioning slot with no assigned role.';
}

export function MappingCard({
  slot,
  updateSlot,
  deviceOptions,
  driverOptions,
  compact = false,
}: {
  slot: SourceSlot;
  updateSlot: (slotId: string, patch: Partial<SourceSlot>) => void;
  deviceOptions: Array<[DeviceType, string]>;
  driverOptions?: DriverMeta[];
  compact?: boolean;
}) {
  const showDriverSelect = slot.role === 'grid_meter' || slot.role === 'inverter';
  const driverSelectOptions: Array<[string, string]> = [
    ['__none__', 'Built-in template (Device Type)'],
    ...(driverOptions ?? [])
      .filter((d) => (slot.role === 'grid_meter' ? d.deviceType === 'meter' : d.deviceType === 'inverter'))
      .map((d) => [d.id, `${d.name}${d.vendor ? ` · ${d.vendor}` : ''}`] as [string, string]),
  ];

  return (
    <div className='slot-card'>
      <h2>{slot.label}</h2>
      <p className='help-text'>{slotSummaryHelp(slot)}</p>
      {slot.driverId ? (
        <div className='inline-banner' style={{ marginBottom: 12 }}>
          Driver override selected: <span className='inline-code'>{slot.driverId}</span>
        </div>
      ) : null}
      <div className='form-grid'>
        <ToggleField
          label='Enabled'
          help='Include this entry in the commissioning model.'
          checked={slot.enabled}
          onChange={(v) => updateSlot(slot.id, { enabled: v })}
        />
        {showDriverSelect && driverOptions && driverOptions.length > 0 ? (
          <SelectField
            label='Driver'
            help='Optional: select a Manufacturer driver override (used by YAML export).'
            value={slot.driverId ? slot.driverId : '__none__'}
            onChange={(v) => updateSlot(slot.id, { driverId: v === '__none__' ? undefined : v })}
            options={driverSelectOptions}
          />
        ) : null}
        <SelectField
          label='Device Type'
          help={deviceHelp[slot.deviceType]}
          value={slot.deviceType}
          onChange={(v) => updateSlot(slot.id, { deviceType: v as DeviceType, driverId: undefined })}
          options={deviceOptions}
          dataTestId={`slot-${slot.id}-device-type`}
        />
        <SelectField
          label='Role'
          help={roleHelp[slot.role]}
          value={slot.role}
          onChange={(v) => {
            const nextRole = v as SourceRole;
            const nextOptions = deviceOptionsForRole(nextRole);
            const currentValid = nextOptions.some(
              ([deviceType]) => deviceType === slot.deviceType,
            );
            updateSlot(slot.id, {
              role: nextRole,
              deviceType: currentValid ? slot.deviceType : (nextOptions[0]?.[0] ?? 'none'),
            });
          }}
          options={[
            ['none', 'none'],
            ['grid_meter', 'grid_meter'],
            ['generator_meter', 'generator_meter'],
            ['inverter', 'inverter'],
          ]}
        />
        <SelectField
          label='Transport'
          help='Per-slot transport: RS485 Modbus RTU on the controller UART, or Modbus TCP to a device on the LAN. A single site can mix RTU and TCP slots; the exported site bundle lists each slot’s transport and TCP host/port for firmware YAML mapping (see Modular_Yaml/modbus_tcp_manager.yaml).'
          value={slot.transport || 'rtu'}
          onChange={(v) =>
            updateSlot(slot.id, {
              transport: v as 'rtu' | 'tcp',
              tcpPort: v === 'tcp' ? slot.tcpPort ?? 502 : slot.tcpPort,
            })
          }
          options={[
            ['rtu', 'rtu (RS485)'],
            ['tcp', 'tcp (Modbus TCP/IP)'],
          ]}
        />
        <NumberField
          label='Unit ID'
          help='Modbus unit/slave ID (RTU slave ID or Modbus TCP unit identifier).'
          value={slot.modbusId}
          onChange={(v) => updateSlot(slot.id, { modbusId: v })}
        />
        {slot.transport === 'tcp' ? (
          <>
            <TextField
              label='TCP Host'
              help='IP or hostname of the Modbus TCP device (e.g., PC simulator or meter).'
              value={slot.tcpHost || ''}
              onChange={(v) => updateSlot(slot.id, { tcpHost: v })}
            />
            <NumberField
              label='TCP Port'
              help='Modbus TCP port (default 502).'
              value={slot.tcpPort ?? 502}
              onChange={(v) => updateSlot(slot.id, { tcpPort: v })}
            />
          </>
        ) : null}
        <NumberField
          label='Capacity kW'
          help='Nominal capacity used for documentation and sizing.'
          value={slot.capacityKw}
          onChange={(v) => updateSlot(slot.id, { capacityKw: v })}
          step={0.1}
        />
        <TextField
          label='Network ID'
          help='Logical network assignment for combined or separate operation.'
          value={slot.networkId || ''}
          onChange={(v) => updateSlot(slot.id, { networkId: v })}
        />
        <SelectField
          label='Bus Side'
          help='Assign this source or inverter to bus A, bus B, or both.'
          value={slot.busSide || 'A'}
          onChange={(v) => updateSlot(slot.id, { busSide: v as 'A' | 'B' | 'both' })}
          options={[
            ['A', 'A'],
            ['B', 'B'],
            ['both', 'both'],
          ]}
        />
        {slot.role === 'generator_meter' ? (
          <SelectField
            label='Generator Type'
            help='Diesel and gas defaults drive minimum loading policy.'
            value={slot.generatorType || 'diesel'}
            onChange={(v) =>
              updateSlot(slot.id, { generatorType: v as 'diesel' | 'gas' })
            }
            options={[
              ['diesel', 'diesel'],
              ['gas', 'gas'],
            ]}
          />
        ) : null}
        {!compact ? (
          <>
            <TextField
              label='IP Hint / Notes'
              help='Optional IP hint or field note for commissioning.'
              value={slot.ipHint || ''}
              onChange={(v) => updateSlot(slot.id, { ipHint: v })}
            />
            <TextField
              label='Commissioning Notes'
              help='Additional site-specific notes.'
              value={slot.notes || ''}
              onChange={(v) => updateSlot(slot.id, { notes: v })}
            />
          </>
        ) : null}
      </div>
      {!compact ? (
        <div className='slot-help'>Template hint: {templateHelp[slot.deviceType]}</div>
      ) : null}
    </div>
  );
}
