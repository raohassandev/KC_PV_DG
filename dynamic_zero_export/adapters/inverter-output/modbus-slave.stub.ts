import { type InverterOutputAdapter } from './base';
import { type VirtualMeterState } from '../../runtime/virtual-meter';
import { createAdapterState } from '../health';

export class ModbusSlaveVirtualMeterAdapter implements InverterOutputAdapter {
  readonly id = 'inverter-output-modbus-slave';
  readonly kind = 'modbus-slave';
  readonly capabilities = {
    adapterId: this.id,
    adapterKind: this.kind,
    capabilities: [
      {
        id: 'virtual-meter',
        label: 'Expose virtual meter to inverter',
        supportedModes: ['pass_through', 'adjusted', 'safe_fallback'],
        notes: ['Starter-kit stub for downstream meter emulation'],
      },
    ],
  };
  readonly requiredConfigKeys = ['virtualMeter.profileId', 'virtualMeter.slaveId'];
  readonly state = createAdapterState(this.id, this.kind);

  async connect(): Promise<void> {
    return;
  }

  async disconnect(): Promise<void> {
    return;
  }

  async publishVirtualMeter(_state: VirtualMeterState): Promise<void> {
    return;
  }

  validateConfig(): string[] {
    return [];
  }
}
