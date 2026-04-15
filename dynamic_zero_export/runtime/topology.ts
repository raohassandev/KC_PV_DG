import { type DynamicZeroExportSiteConfig, type TopologyType } from '../schema/site-config.types';

export type DerivedTopology = {
  type: TopologyType;
  mode: 'single' | 'dual-separate' | 'dual-combined' | 'ambiguous';
  zones: Array<{ id: string; label: string; busSide: 'A' | 'B' | 'both' }>;
};

export function deriveTopology(config: DynamicZeroExportSiteConfig): DerivedTopology {
  if (config.topology.type === 'DUAL_BUS_COMBINED') {
    return {
      type: config.topology.type,
      mode: 'dual-combined',
      zones: [{ id: 'combined', label: 'Combined Zone', busSide: 'both' }],
    };
  }
  if (config.topology.type === 'DUAL_BUS_SEPARATE') {
    return {
      type: config.topology.type,
      mode: 'dual-separate',
      zones: [
        { id: 'bus_a', label: 'Bus A', busSide: 'A' },
        { id: 'bus_b', label: 'Bus B', busSide: 'B' },
      ],
    };
  }
  if (config.topology.type.startsWith('DUAL_BUS')) {
    return {
      type: config.topology.type,
      mode: config.topology.tieSignalPresent ? 'dual-separate' : 'ambiguous',
      zones: [
        { id: 'bus_a', label: 'Bus A', busSide: 'A' },
        { id: 'bus_b', label: 'Bus B', busSide: 'B' },
      ],
    };
  }
  return {
    type: config.topology.type,
    mode: 'single',
    zones: [{ id: 'site', label: 'Site', busSide: 'both' }],
  };
}

