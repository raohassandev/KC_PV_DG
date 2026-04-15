export type CommissioningSummaryCard = {
  label: string;
  value: string;
  note?: string;
};

export type CommissioningSummaryModel = {
  siteName: string;
  role: 'manufacturer' | 'installer' | 'user';
  cards: CommissioningSummaryCard[];
  warnings: string[];
  checklist: string[];
  configState: 'draft' | 'validated' | 'exported' | 'live';
};

