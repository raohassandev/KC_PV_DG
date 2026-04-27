import type { DriverDefinition } from './driverStore.js';
import { m4mRegisters } from './builtinDriversData/m4mRegisters.js';
import { wm15Registers } from './builtinDriversData/wm15Registers.js';
import { iskraMc3Registers } from './builtinDriversData/iskraMc3Registers.js';
import { gcMultilineRegisters } from './builtinDriversData/gcMultilineRegisters.js';
import { cpsChintRegisters } from './builtinDriversData/cpsChintRegisters.js';
import { sajRegisters } from './builtinDriversData/sajRegisters.js';
import { solaxRegisters } from './builtinDriversData/solaxRegisters.js';
import { sofarCnRegisters } from './builtinDriversData/sofarCnRegisters.js';
import { huaweiInverterRegisters } from './builtinDriversData/huaweiInverterRegisters.js';
import { huaweiSmartloggerRegisters } from './builtinDriversData/huaweiSmartloggerRegisters.js';
import { sungrowRegisters } from './builtinDriversData/sungrowRegisters.js';
import { knoxAswRegisters } from './builtinDriversData/knoxAswRegisters.js';
import { solisRegisters } from './builtinDriversData/solisRegisters.js';
import { growattRegisters } from './builtinDriversData/growattRegisters.js';

export function builtinDrivers(): DriverDefinition[] {
  const now = new Date().toISOString();
  const base = {
    createdAt: now,
    updatedAt: now,
    recommendedPollMs: 1000,
  } satisfies Pick<DriverDefinition, 'createdAt' | 'updatedAt' | 'recommendedPollMs'>;

  return [
    // --- Meters ---
    {
      ...base,
      id: 'em500_grid',
      name: 'EM500 (Grid meter)',
      vendor: 'Rozwell / EM500 family',
      deviceType: 'meter',
      notes:
        'Built-in baseline EM500 grid meter driver. For full validated mapping see Modular_Yaml/meter_em500_grid.yaml. You can override by saving a driver with the same id.',
      registers: [
        // Synced from Modular_Yaml/meter_em500_grid.yaml
        { paramKey: 'grid_l1_voltage', label: 'Grid L1 Voltage', unit: 'V', registerType: 'read', address: 0x0002, valueKind: 'U_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l2_voltage', label: 'Grid L2 Voltage', unit: 'V', registerType: 'read', address: 0x0004, valueKind: 'U_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l3_voltage', label: 'Grid L3 Voltage', unit: 'V', registerType: 'read', address: 0x0006, valueKind: 'U_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l1_current', label: 'Grid L1 Current', unit: 'A', registerType: 'read', address: 0x0008, valueKind: 'U_DWORD', scale: 0.0001, precision: 4 },
        { paramKey: 'grid_l2_current', label: 'Grid L2 Current', unit: 'A', registerType: 'read', address: 0x000a, valueKind: 'U_DWORD', scale: 0.0001, precision: 4 },
        { paramKey: 'grid_l3_current', label: 'Grid L3 Current', unit: 'A', registerType: 'read', address: 0x000c, valueKind: 'U_DWORD', scale: 0.0001, precision: 4 },
        { paramKey: 'grid_l1_active_power_w', label: 'Grid L1 Active Power', unit: 'W', registerType: 'read', address: 0x0014, valueKind: 'S_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l2_active_power_w', label: 'Grid L2 Active Power', unit: 'W', registerType: 'read', address: 0x0016, valueKind: 'S_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l3_active_power_w', label: 'Grid L3 Active Power', unit: 'W', registerType: 'read', address: 0x0018, valueKind: 'S_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l1_reactive_power_var', label: 'Grid L1 Reactive Power', unit: 'var', registerType: 'read', address: 0x001a, valueKind: 'S_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l2_reactive_power_var', label: 'Grid L2 Reactive Power', unit: 'var', registerType: 'read', address: 0x001c, valueKind: 'S_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l3_reactive_power_var', label: 'Grid L3 Reactive Power', unit: 'var', registerType: 'read', address: 0x001e, valueKind: 'S_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l1_apparent_power_va', label: 'Grid L1 Apparent Power', unit: 'VA', registerType: 'read', address: 0x0020, valueKind: 'U_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l2_apparent_power_va', label: 'Grid L2 Apparent Power', unit: 'VA', registerType: 'read', address: 0x0022, valueKind: 'U_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l3_apparent_power_va', label: 'Grid L3 Apparent Power', unit: 'VA', registerType: 'read', address: 0x0024, valueKind: 'U_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_l1_pf', label: 'Grid L1 Power Factor', registerType: 'read', address: 0x0026, valueKind: 'S_DWORD', scale: 0.0001, precision: 4 },
        { paramKey: 'grid_l2_pf', label: 'Grid L2 Power Factor', registerType: 'read', address: 0x0028, valueKind: 'S_DWORD', scale: 0.0001, precision: 4 },
        { paramKey: 'grid_l3_pf', label: 'Grid L3 Power Factor', registerType: 'read', address: 0x002a, valueKind: 'S_DWORD', scale: 0.0001, precision: 4 },
        { paramKey: 'grid_frequency', label: 'Grid Frequency', unit: 'Hz', registerType: 'read', address: 0x0032, valueKind: 'U_DWORD', scale: 0.001, precision: 3 },
        { paramKey: 'grid_eqv_voltage', label: 'Grid Equivalent Phase Voltage', unit: 'V', registerType: 'read', address: 0x0034, valueKind: 'U_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_eqv_current', label: 'Grid Equivalent Current', unit: 'A', registerType: 'read', address: 0x0038, valueKind: 'U_DWORD', scale: 0.0001, precision: 4 },
        { paramKey: 'grid_total_power_w', label: 'Grid Total Active Power', unit: 'W', registerType: 'read', address: 0x003a, valueKind: 'S_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_total_reactive_power_var', label: 'Grid Total Reactive Power', unit: 'var', registerType: 'read', address: 0x003c, valueKind: 'S_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_total_apparent_power_va', label: 'Grid Total Apparent Power', unit: 'VA', registerType: 'read', address: 0x003e, valueKind: 'U_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_total_pf', label: 'Grid Total Power Factor', registerType: 'read', address: 0x0040, valueKind: 'S_DWORD', scale: 0.0001, precision: 4 },
        { paramKey: 'grid_import_kwh', label: 'Grid Import Energy', unit: 'kWh', registerType: 'holding', address: 0x1b21, valueKind: 'U_QWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_export_kwh', label: 'Grid Export Energy', unit: 'kWh', registerType: 'holding', address: 0x1b25, valueKind: 'U_QWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_import_kwh_t1', label: 'Grid Import Energy Tariff 1', unit: 'kWh', registerType: 'holding', address: 0x1b49, valueKind: 'U_QWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_export_kwh_t1', label: 'Grid Export Energy Tariff 1', unit: 'kWh', registerType: 'holding', address: 0x1b4d, valueKind: 'U_QWORD', scale: 0.01, precision: 2 },
        { paramKey: 'grid_import_kwh_t2', label: 'Grid Import Energy Tariff 2', unit: 'kWh', registerType: 'holding', address: 0x1b5d, valueKind: 'U_QWORD', scale: 0.01, precision: 2 },
      ],
    },
    {
      ...base,
      id: 'em500_v2',
      name: 'EM500 Meter v2 (template)',
      vendor: 'Rozwell / EM500 family',
      deviceType: 'meter',
      notes: 'Template for EM500-compatible variants. Start here, then tune registers as needed.',
      registers: [],
    },
    {
      ...base,
      id: 'em500_generator',
      name: 'EM500 Generator meter (template)',
      vendor: 'Rozwell / EM500 family',
      deviceType: 'meter',
      notes: 'Template for generator-side metering using EM500 family devices.',
      registers: [],
    },
    {
      ...base,
      id: 'wm15',
      name: 'Carlo Gavazzi WM15 (baseline)',
      vendor: 'Carlo Gavazzi',
      deviceType: 'meter',
      notes:
        'Baseline driver seeded from docs/Energy Analyzer/Mannual/Energy Analyzer/Carlo Gavazzi WM15 Rs-485 Registers.pdf. Uses physical addresses (hex) and INT32/INT64 formats. Register functions 03/04 are equivalent per manual; this driver uses FC4-style `read`.',
      registers: wm15Registers,
    },
    {
      ...base,
      id: 'kpm37',
      name: 'KPM37 Rail meter (template)',
      vendor: 'KPM37',
      deviceType: 'meter',
      notes:
        'Template only. The manual in docs/Energy Analyzer/ does not include the Modbus register table (it says to contact supplier), so this cannot be seeded until the register map is added.',
      registers: [],
    },
    {
      ...base,
      id: 'iskra_mc3',
      name: 'Iskra MC3x0x (baseline)',
      vendor: 'Iskra',
      deviceType: 'meter',
      notes:
        'Baseline driver seeded from docs/Energy Analyzer/Iskra. K_MC3x0x_GB_22444000_Usersmanual_Ver_8.00.pdf (Appendix A). Uses MC7x0-compatible map input registers (3xxxx) via FC4. Addresses are converted to 0-based offsets (e.g. 30107 → 106).',
      registers: iskraMc3Registers,
    },
    {
      ...base,
      id: 'm4m',
      name: 'M4M (baseline)',
      vendor: 'Carlo Gavazzi / M4M',
      deviceType: 'meter',
      notes:
        'Baseline driver seeded from docs/Energy Analyzer/M4M Modbus map - v.1.3N.xlsx (Mapping Table). Addresses use the spreadsheet Reg (Dec) values.',
      registers: m4mRegisters,
    },
    {
      ...base,
      id: 'gc_multiline',
      name: 'GC / DST4602 multiline (baseline)',
      vendor: 'GC / DST',
      deviceType: 'meter',
      notes:
        'Baseline driver seeded from docs/Energy Analyzer/Mannual/Energy Analyzer/GC400-GC500-GC600-DST4602-MC100MC200-BTB200-BTB100.pdf. Addresses use the DEC register numbers from the doc tables.',
      registers: gcMultilineRegisters,
    },
    {
      ...base,
      id: 'generic_modbus_meter',
      name: 'Generic Modbus meter (blank)',
      vendor: 'Generic',
      deviceType: 'meter',
      notes: 'Blank driver to quickly build a custom meter map (registers, scaling, byte/word order).',
      registers: [],
    },

    // --- Inverters ---
    {
      ...base,
      id: 'huawei_inverter',
      name: 'Huawei inverter (baseline)',
      vendor: 'Huawei',
      deviceType: 'inverter',
      notes:
        'Built-in baseline Huawei inverter driver (read path). For full mapping see Modular_Yaml/inverter_huawei.yaml. You can override by saving a driver with the same id.',
      registers: huaweiInverterRegisters,
    },
    {
      ...base,
      id: 'huawei_smartlogger',
      name: 'Huawei SmartLogger (baseline)',
      vendor: 'Huawei',
      deviceType: 'inverter',
      notes:
        'Baseline driver seeded from docs/Inverter/Huawei/SmartLogger ModBus Interface Definitions.pdf (SmartLogger register definitions table and public blocks). Some registers are model/firmware-dependent; disable any signals not supported by your SmartLogger variant.',
      registers: huaweiSmartloggerRegisters,
    },
    {
      ...base,
      id: 'sma',
      name: 'SMA (baseline SunSpec)',
      vendor: 'SMA',
      deviceType: 'inverter',
      notes:
        'Baseline SunSpec driver seeded from docs/Inverter/SMA/SMA-Modbus-general-TI-en-10.pdf. SunSpec profile starts at 40001 (PLC/base-1); Modbus protocol address is typically (register - 1). This driver stores SunSpec model registers using base-0/protocol-style addresses (e.g. 40083 from the vendor examples). Scale-factor registers are included; apply Value * 10^SF in firmware if you want normalized values.',
      registers: [
        // SunSpec inverter model (based on vendor example layout: common block 40001.. then inverter model starts ~40070)
        { paramKey: 'ac_current', label: 'AC Total Current (raw)', unit: 'A', registerType: 'holding', address: 40071, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_current_a', label: 'AC Current Phase A (raw)', unit: 'A', registerType: 'holding', address: 40072, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_current_b', label: 'AC Current Phase B (raw)', unit: 'A', registerType: 'holding', address: 40073, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_current_c', label: 'AC Current Phase C (raw)', unit: 'A', registerType: 'holding', address: 40074, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_current_sf', label: 'AC Current SF', registerType: 'holding', address: 40075, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_voltage_ab', label: 'AC Voltage AB (raw)', unit: 'V', registerType: 'holding', address: 40076, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_voltage_bc', label: 'AC Voltage BC (raw)', unit: 'V', registerType: 'holding', address: 40077, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_voltage_ca', label: 'AC Voltage CA (raw)', unit: 'V', registerType: 'holding', address: 40078, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_voltage_sf', label: 'AC Voltage SF', registerType: 'holding', address: 40082, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_power_w', label: 'AC Power (raw)', unit: 'W', registerType: 'holding', address: 40083, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_power_sf', label: 'AC Power SF', registerType: 'holding', address: 40084, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_freq', label: 'AC Frequency (raw)', unit: 'Hz', registerType: 'holding', address: 40085, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_freq_sf', label: 'AC Frequency SF', registerType: 'holding', address: 40086, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_va', label: 'AC Apparent Power (raw)', unit: 'VA', registerType: 'holding', address: 40087, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_va_sf', label: 'AC Apparent Power SF', registerType: 'holding', address: 40088, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_var', label: 'AC Reactive Power (raw)', unit: 'var', registerType: 'holding', address: 40089, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_var_sf', label: 'AC Reactive Power SF', registerType: 'holding', address: 40090, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_pf', label: 'AC Power Factor (raw)', unit: '%', registerType: 'holding', address: 40091, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_pf_sf', label: 'AC Power Factor SF', registerType: 'holding', address: 40092, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_energy_wh', label: 'AC Lifetime Energy (raw)', unit: 'Wh', registerType: 'holding', address: 40093, valueKind: 'U_DWORD', scale: 1, precision: 0 },
        { paramKey: 'ac_energy_wh_sf', label: 'AC Energy SF', registerType: 'holding', address: 40095, valueKind: 'U_WORD', scale: 1, precision: 0 },
      ],
    },
    {
      ...base,
      id: 'solaredge',
      name: 'SolarEdge (baseline SunSpec)',
      vendor: 'SolarEdge',
      deviceType: 'inverter',
      notes:
        'Baseline SunSpec driver seeded from docs/Inverter/Solar edge/se-modbus-interface-for-solaredge-terramax-inverter-technical-note.pdf. Uses the inverter model block registers (base-0 style shown in the doc). Scale-factor registers are included; apply Value * 10^SF in firmware if you want normalized values.',
      registers: [
        { paramKey: 'ac_current', label: 'AC Total Current (raw)', unit: 'A', registerType: 'holding', address: 40071, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_current_a', label: 'AC Current Phase A (raw)', unit: 'A', registerType: 'holding', address: 40072, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_current_b', label: 'AC Current Phase B (raw)', unit: 'A', registerType: 'holding', address: 40073, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_current_c', label: 'AC Current Phase C (raw)', unit: 'A', registerType: 'holding', address: 40074, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_current_sf', label: 'AC Current SF', registerType: 'holding', address: 40075, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_voltage_ab', label: 'AC Voltage AB (raw)', unit: 'V', registerType: 'holding', address: 40076, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_voltage_bc', label: 'AC Voltage BC (raw)', unit: 'V', registerType: 'holding', address: 40077, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_voltage_ca', label: 'AC Voltage CA (raw)', unit: 'V', registerType: 'holding', address: 40078, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_voltage_sf', label: 'AC Voltage SF', registerType: 'holding', address: 40082, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_power_w', label: 'AC Power (raw)', unit: 'W', registerType: 'holding', address: 40083, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_power_sf', label: 'AC Power SF', registerType: 'holding', address: 40084, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_freq', label: 'AC Frequency (raw)', unit: 'Hz', registerType: 'holding', address: 40085, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_freq_sf', label: 'AC Frequency SF', registerType: 'holding', address: 40086, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_va', label: 'AC Apparent Power (raw)', unit: 'VA', registerType: 'holding', address: 40087, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_va_sf', label: 'AC Apparent Power SF', registerType: 'holding', address: 40088, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_var', label: 'AC Reactive Power (raw)', unit: 'var', registerType: 'holding', address: 40089, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_var_sf', label: 'AC Reactive Power SF', registerType: 'holding', address: 40090, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_pf', label: 'AC Power Factor (raw)', unit: '%', registerType: 'holding', address: 40091, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'ac_pf_sf', label: 'AC Power Factor SF', registerType: 'holding', address: 40092, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'ac_energy_wh', label: 'AC Lifetime Energy (raw)', unit: 'Wh', registerType: 'holding', address: 40093, valueKind: 'U_DWORD', scale: 1, precision: 0 },
        { paramKey: 'ac_energy_wh_sf', label: 'AC Energy SF', registerType: 'holding', address: 40095, valueKind: 'U_WORD', scale: 1, precision: 0 },

        { paramKey: 'dc_current', label: 'DC Current (raw)', unit: 'A', registerType: 'holding', address: 40096, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'dc_current_sf', label: 'DC Current SF', registerType: 'holding', address: 40097, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'dc_voltage', label: 'DC Voltage (raw)', unit: 'V', registerType: 'holding', address: 40098, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'dc_voltage_sf', label: 'DC Voltage SF', registerType: 'holding', address: 40099, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'dc_power_w', label: 'DC Power (raw)', unit: 'W', registerType: 'holding', address: 40100, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'dc_power_sf', label: 'DC Power SF', registerType: 'holding', address: 40101, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'temp_sink', label: 'Heat Sink Temperature (raw)', unit: '°C', registerType: 'holding', address: 40103, valueKind: 'S_WORD', scale: 1, precision: 0 },
        { paramKey: 'temp_sf', label: 'Temperature SF', registerType: 'holding', address: 40106, valueKind: 'S_WORD', scale: 1, precision: 0 },

        { paramKey: 'status', label: 'Operating State', registerType: 'holding', address: 40107, valueKind: 'U_WORD', scale: 1, precision: 0 },
        { paramKey: 'status_vendor', label: 'Vendor Operating State / Error Code', registerType: 'holding', address: 40108, valueKind: 'U_WORD', scale: 1, precision: 0 },
      ],
    },
    {
      ...base,
      id: 'growatt',
      name: 'Growatt (baseline)',
      vendor: 'Growatt',
      deviceType: 'inverter',
      notes:
        'Baseline driver seeded from docs/Inverter/GROWATT.pdf (Growatt Inverter Modbus RTU Protocol TH-276-00). Values are listed as H/L 16-bit words; this driver reads them as 32-bit DWORD starting at the H register.',
      registers: growattRegisters,
    },
    {
      ...base,
      id: 'solax',
      name: 'Solax Hybrid G4 (baseline)',
      vendor: 'Solax',
      deviceType: 'inverter',
      notes: 'Baseline driver seeded from docs/Inverter/Solax/Hybrid-X1X3-G4-ModbusTCPRTU-V321-English_0622-pub_240818_001120.pdf.',
      registers: solaxRegisters,
    },
    {
      ...base,
      id: 'sungrow',
      name: 'Sungrow (baseline)',
      vendor: 'Sungrow',
      deviceType: 'inverter',
      notes:
        'Baseline driver seeded from docs/Inverter/Sungrow .pdf. The manual notes Modbus requests should use (register_address - 1); this driver stores addresses already adjusted (e.g. 5000 → 4999).',
      registers: sungrowRegisters,
    },
    {
      ...base,
      id: 'cps_chint',
      name: 'Chint / CPS (baseline)',
      vendor: 'Chint / CPS',
      deviceType: 'inverter',
      notes: 'Baseline driver seeded from docs/Inverter/CPS/CPS_100_125kW-UL-Modbus-Map-Spec-FW-V12.0.pdf.',
      registers: cpsChintRegisters,
    },
    {
      ...base,
      id: 'solis',
      name: 'Solis (baseline)',
      vendor: 'Solis',
      deviceType: 'inverter',
      notes:
        'Baseline driver seeded from docs/Inverter/Solis.pdf. The excerpted map includes meter-side measurements and import/export energies (3X addresses). Some Modbus clients require “address - 1”; if values look shifted, tune addresses by -1.',
      registers: solisRegisters,
    },
    {
      ...base,
      id: 'saj',
      name: 'SAJ Plus series (baseline)',
      vendor: 'SAJ',
      deviceType: 'inverter',
      notes: 'Baseline driver seeded from docs/SAJ/saj-plus-series-inverter-modbus-protocal.pdf.',
      registers: sajRegisters,
    },
    {
      ...base,
      id: 'sofar_cn',
      name: 'Sofar (CN sheet) (baseline)',
      vendor: 'Sofar (CN Modbus sheet)',
      deviceType: 'inverter',
      notes: 'Baseline driver seeded from docs/Inverter/首航外部Modbus通讯协议地址说明(1)(1).xlsx (地址说明 sheet).',
      registers: sofarCnRegisters,
    },
    {
      ...base,
      id: 'knox_asw',
      name: 'Knox / ASW LT-G2 (baseline)',
      vendor: 'Knox / ASW',
      deviceType: 'inverter',
      notes:
        'Baseline driver seeded from docs/Inverter/Knox/MB001_ASW GEN-Modbus-en_V2.1.5(2).pdf (AISWEI Modbus profile). Uses both input (3xxxx / FC4) and holding (4xxxx / FC3) registers as defined by the vendor tables. Addresses use the published DEC addresses.',
      registers: knoxAswRegisters,
    },
    {
      ...base,
      id: 'generic_modbus_inverter',
      name: 'Generic Modbus inverter (blank)',
      vendor: 'Generic',
      deviceType: 'inverter',
      notes: 'Blank driver to quickly build a custom inverter map (read registers first).',
      registers: [],
    },
  ];
}

