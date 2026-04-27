import type { DriverRegister } from '../driverStore.js';

export const huaweiInverterRegisters: DriverRegister[] = [
  { paramKey: 'inverter_command_kw', label: 'Inverter Command kW', registerType: 'read', address: 40120, valueKind: 'U_WORD', scale: 10.0 },
  { paramKey: 'remote_schedule_raw', label: 'Remote Schedule Raw', registerType: 'read', address: 42014, valueKind: 'U_WORD' },
  { paramKey: 'active_gradient_pct_s', label: 'Active Gradient pct_s', registerType: 'read', address: 42017, valueKind: 'U_DWORD', scale: 1000.0 },
  { paramKey: 'schedule_maintain_time_s', label: 'Schedule Maintain Time s', registerType: 'read', address: 42019, valueKind: 'U_DWORD' },
  { paramKey: 'fail_protect_raw', label: 'Fail Protect Raw', registerType: 'read', address: 42075, valueKind: 'U_WORD' },
  { paramKey: 'fail_active_mode_raw', label: 'Fail Active Mode Raw', registerType: 'read', address: 42076, valueKind: 'U_WORD' },
  { paramKey: 'fail_active_power_kw', label: 'Fail Active Power kW', registerType: 'read', address: 42077, valueKind: 'U_DWORD', scale: 10.0 },
  { paramKey: 'solar_inverter_pmax', label: 'Solar Inverter Pmax', unit: 'kW', registerType: 'read', address: 30083, valueKind: 'U_DWORD', precision: 3 },
  { paramKey: 'solar_inverter_actual_power', label: 'Solar Inverter Actual Power', unit: 'kW', registerType: 'read', address: 32080, valueKind: 'S_DWORD', precision: 3 },
];
