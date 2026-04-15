import { type MeterInputAdapter } from './base';
import { type RealMeterSample } from '../../runtime/source-detection';
import { createAdapterState } from '../health';

export class ModbusRtuMeterInputAdapter implements MeterInputAdapter {
  readonly id = 'meter-input-modbus-rtu';
  readonly kind = 'modbus-rtu';
  readonly capabilities = {
    adapterId: this.id,
    adapterKind: this.kind,
    capabilities: [
      {
        id: 'poll-rs485',
        label: 'Poll RTU meter over RS485',
        supportedModes: ['GRID', 'GENERATOR'],
        notes: ['Stub adapter for runtime starter kit'],
      },
    ],
  };
  readonly requiredConfigKeys = ['meterInput.transport', 'meterInput.addressing.slaveId'];
  readonly state = createAdapterState(this.id, this.kind);

  async connect(): Promise<void> {
    return;
  }

  async disconnect(): Promise<void> {
    return;
  }

  async readSample(): Promise<RealMeterSample> {
    return { kw: 0, stale: true };
  }

  validateConfig(): string[] {
    return [];
  }
}
