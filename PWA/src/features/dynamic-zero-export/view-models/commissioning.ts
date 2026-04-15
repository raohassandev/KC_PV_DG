import type { CommissioningSummaryModel } from '../../../../../dynamic_zero_export/pwa';
import { liveStatusFixture } from '../mock/liveStatus';

export function buildCommissioningViewModel(): CommissioningSummaryModel {
  return {
    siteName: liveStatusFixture.siteName,
    role: 'installer',
    cards: [
      { label: 'Topology', value: 'SINGLE_BUS', note: 'Current commissioning profile' },
      { label: 'Source', value: 'RTU meter', note: 'Validated EM500/legacy path' },
      { label: 'Policy', value: 'Zero export', note: 'Commissioning baseline' },
      { label: 'Device', value: liveStatusFixture.deviceOnline ? 'Online' : 'Offline' },
    ],
    warnings: ['Huawei inverter write gate stays pending until site validation'],
    checklist: [
      'Verify upstream meter source',
      'Verify inverter-facing profile',
      'Verify connectivity and IP reachability',
      'Review topology and policy summary',
    ],
    configState: 'validated',
  };
}

