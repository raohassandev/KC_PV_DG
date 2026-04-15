import { type MeterInputConfig } from '../../schema/site-config.types';
import { type RealMeterSample } from '../../runtime/source-detection';
import { type AdapterState } from '../health';
import { type AdapterCapabilities } from '../capabilities';

export interface MeterInputAdapter {
  readonly id: string;
  readonly kind: string;
  readonly capabilities: AdapterCapabilities;
  readonly requiredConfigKeys: string[];
  readonly state: AdapterState;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  readSample(): Promise<RealMeterSample>;
  validateConfig(config: MeterInputConfig): string[];
}

export function describeMeterInput(config: MeterInputConfig) {
  return `${config.transport}:${config.brand}:${config.profileId}`;
}
