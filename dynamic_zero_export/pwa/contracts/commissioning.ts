export type CommissioningSummaryCard = {
  label: string;
  value: string;
  note?: string;
};

export type CommissioningConfigReviewSnapshot = {
  valid: boolean;
  warnings: string[];
  errors: string[];
  reviewLines: string[];
};

export type CommissioningSummaryModel = {
  siteName: string;
  role: 'manufacturer' | 'installer' | 'user';
  cards: CommissioningSummaryCard[];
  warnings: string[];
  checklist: string[];
  configState: 'draft' | 'validated' | 'exported' | 'live';
  /** Present when data came from `/api/commissioning-summary`. */
  reviewLines?: string[];
  /** Present when `/api/config-review` was merged into the view. */
  configReview?: CommissioningConfigReviewSnapshot;
};

