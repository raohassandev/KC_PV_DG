import type { DynamicZeroExportSiteConfig } from '../schema/site-config.types';
import type { PolicyEngineResult } from '../runtime/policy-engine';
import { createCommissioningSummary } from '../runtime/commissioning-summary';
import { buildConfigReview } from './config-review';

export function buildCommissioningSummary(
  config: DynamicZeroExportSiteConfig,
  policy: PolicyEngineResult,
) {
  const review = buildConfigReview(config);
  const summary = createCommissioningSummary(config, policy);
  return {
    ...summary,
    warnings: [...new Set([...summary.warnings, ...review.warnings])],
    readinessChecklist: review.checklist,
    reviewLines: review.summaryLines,
  };
}

