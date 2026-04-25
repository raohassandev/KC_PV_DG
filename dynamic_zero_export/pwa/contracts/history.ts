export type HistoryGranularity = '5m' | 'hour' | 'day' | 'month' | 'year';

export type EnergyHistoryPoint = {
  timestamp: string;
  solarKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  generatorKwh: number;
  curtailedKwh: number;
};

export type EnergyHistorySeries = {
  granularity: HistoryGranularity;
  points: EnergyHistoryPoint[];
};

export type EnergyHistoryViewModel = {
  today: EnergyHistorySeries;
  month: EnergyHistorySeries;
  year: EnergyHistorySeries;
  decade: EnergyHistorySeries;
  highlights: string[];
};

export function aggregateEnergy(points: EnergyHistoryPoint[]) {
  return points.reduce(
    (totals, point) => ({
      solarKwh: totals.solarKwh + point.solarKwh,
      gridImportKwh: totals.gridImportKwh + point.gridImportKwh,
      gridExportKwh: totals.gridExportKwh + point.gridExportKwh,
      generatorKwh: totals.generatorKwh + point.generatorKwh,
      curtailedKwh: totals.curtailedKwh + point.curtailedKwh,
    }),
    { solarKwh: 0, gridImportKwh: 0, gridExportKwh: 0, generatorKwh: 0, curtailedKwh: 0 },
  );
}

