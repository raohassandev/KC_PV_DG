import { type MeterInputAdapter } from './base';
import { type RealMeterSample } from '../../runtime/source-detection';
import { createAdapterState } from '../health';

export class ModbusTcpMeterInputAdapter implements MeterInputAdapter {
  readonly id = 'meter-input-modbus-tcp';
  readonly kind = 'modbus-tcp';
  readonly capabilities = {
    adapterId: this.id,
    adapterKind: this.kind,
    capabilities: [
      {
        id: 'poll-tcp',
        label: 'Poll meter over TCP/IP',
        supportedModes: ['GRID', 'GENERATOR'],
        notes: ['Stub adapter for gateway-backed meter sources such as DR302'],
      },
    ],
  };
  readonly requiredConfigKeys = ['meterInput.transport', 'meterInput.addressing.ip', 'meterInput.addressing.port'];
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
