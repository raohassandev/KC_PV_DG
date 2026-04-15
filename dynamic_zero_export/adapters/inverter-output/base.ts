import { type VirtualMeterState } from '../../runtime/virtual-meter';
import { type AdapterState } from '../health';
import { type AdapterCapabilities } from '../capabilities';

export interface InverterOutputAdapter {
  readonly id: string;
  readonly kind: string;
  readonly capabilities: AdapterCapabilities;
  readonly requiredConfigKeys: string[];
  readonly state: AdapterState;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publishVirtualMeter(state: VirtualMeterState): Promise<void>;
  validateConfig(config: unknown): string[];
}
