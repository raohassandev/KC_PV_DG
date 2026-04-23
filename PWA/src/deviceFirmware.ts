import type { DeviceType, SourceSlot } from './siteProfileSchema';

/** Meter device types that currently map to `meter_em500_grid.yaml` in the modular bundle. */
export function meterDeviceHasBundledYaml(deviceType: DeviceType): boolean {
  return (
    deviceType === 'em500' ||
    deviceType === 'em500_v2' ||
    deviceType === 'em500_generator'
  );
}

/** Inverter device types that map to `inverter_huawei.yaml` in the modular bundle. */
export function inverterDeviceHasBundledYaml(deviceType: DeviceType): boolean {
  return deviceType === 'huawei' || deviceType === 'huawei_smartlogger';
}

export function slotUsesBundledModularYaml(slot: SourceSlot): boolean {
  if (!slot.enabled || slot.deviceType === 'none') return true;
  if (slot.role === 'grid_meter' || slot.role === 'generator_meter') {
    return meterDeviceHasBundledYaml(slot.deviceType);
  }
  if (slot.role === 'inverter') {
    return inverterDeviceHasBundledYaml(slot.deviceType);
  }
  return true;
}
