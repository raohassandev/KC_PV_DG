import type { DriverDefinition } from './driverStore.js';

export const BUILTIN_DRIVER_IDS = ['em500_grid', 'huawei_inverter'] as const;

export function builtinDrivers(): DriverDefinition[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'em500_grid',
      name: 'EM500 (Grid meter)',
      vendor: 'Rozwell / EM500 family',
      deviceType: 'meter',
      notes:
        'Built-in baseline EM500 grid meter driver. For full validated mapping see Modular_Yaml/meter_em500_grid.yaml. You can override by saving a driver with the same id.',
      recommendedPollMs: 1000,
      createdAt: now,
      updatedAt: now,
      registers: [
        { paramKey: 'freq_hz', label: 'Frequency', unit: 'Hz', registerType: 'read', address: 0x0032, valueKind: 'U_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'p_total_kw', label: 'Total Active Power', unit: 'kW', registerType: 'read', address: 0x003a, valueKind: 'S_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'v_eq_v', label: 'Equivalent Voltage', unit: 'V', registerType: 'read', address: 0x0034, valueKind: 'U_DWORD', scale: 0.01, precision: 2 },
        { paramKey: 'i_eq_a', label: 'Equivalent Current', unit: 'A', registerType: 'read', address: 0x0038, valueKind: 'U_DWORD', scale: 0.0001, precision: 4 },
      ],
    },
    {
      id: 'huawei_inverter',
      name: 'Huawei inverter (baseline)',
      vendor: 'Huawei',
      deviceType: 'inverter',
      notes:
        'Built-in baseline Huawei inverter driver (read path). For full mapping see Modular_Yaml/inverter_huawei.yaml. You can override by saving a driver with the same id.',
      recommendedPollMs: 1000,
      createdAt: now,
      updatedAt: now,
      registers: [
        { paramKey: 'p_ac_kw', label: 'Active Power', unit: 'kW', registerType: 'read', address: 32080, valueKind: 'U_DWORD', scale: 0.001, precision: 3 },
      ],
    },
  ];
}

