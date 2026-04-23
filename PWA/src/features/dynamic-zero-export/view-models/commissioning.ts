import type {
  CommissioningSummaryModel,
  CommissioningSummaryCard,
} from '../../../../../dynamic_zero_export/pwa';
import type {
  CommissioningSummaryResponse,
  ConfigReviewResponse,
} from '../../../../../dynamic_zero_export/api_contract';
import { liveStatusFixture } from '../mock/liveStatus';
import type { PwaRole } from '../roles';

export function buildCommissioningViewModel(role: PwaRole = 'installer'): CommissioningSummaryModel {
  return {
    siteName: liveStatusFixture.siteName,
    role,
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

export function mapCommissioningApiToModel(
  api: CommissioningSummaryResponse,
  role: PwaRole,
  configReview?: ConfigReviewResponse | null,
): CommissioningSummaryModel {
  const cards: CommissioningSummaryCard[] = [
    { label: 'Topology', value: api.topologySummary, note: 'From controller' },
    { label: 'Sources', value: api.sourceSummary.join(' · ') },
    { label: 'Policy', value: api.policySummary.join(' · ') },
    { label: 'Monitoring', value: api.monitoringSummary.join(' · ') },
  ];

  let configState: CommissioningSummaryModel['configState'] = 'draft';
  if (configReview) {
    configState =
      configReview.valid && configReview.errors.length === 0 ? 'validated' : 'draft';
  }

  return {
    siteName: api.siteName,
    role,
    cards,
    warnings: api.warnings,
    checklist: api.readinessChecklist,
    configState,
    reviewLines: api.reviewLines,
    configReview: configReview
      ? {
          valid: configReview.valid,
          warnings: configReview.warnings,
          errors: configReview.errors,
          reviewLines: configReview.reviewLines,
        }
      : undefined,
  };
}

