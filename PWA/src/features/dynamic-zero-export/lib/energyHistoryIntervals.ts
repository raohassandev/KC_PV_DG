import type { EnergyHistoryPoint } from '../../../../../dynamic_zero_export/pwa';
import type { HistoryViewModel } from '../types';

export type EnergyInterval = 'hourly' | 'daily' | 'weekly' | 'monthly';

export const INTERVAL_OPTIONS: Array<{ id: EnergyInterval; label: string; rangeDescription: string }> = [
  { id: 'hourly', label: 'Hourly', rangeDescription: 'Last 24 hours' },
  { id: 'daily', label: 'Daily', rangeDescription: 'Last 30 days' },
  { id: 'weekly', label: 'Weekly', rangeDescription: 'Last ~30 days (by week)' },
  { id: 'monthly', label: 'Monthly', rangeDescription: 'Last 12 months' },
];

function aggregateSlice(slice: EnergyHistoryPoint[]): EnergyHistoryPoint {
  if (slice.length === 0) {
    return {
      timestamp: '',
      solarKwh: 0,
      gridImportKwh: 0,
      gridExportKwh: 0,
      generatorKwh: 0,
      curtailedKwh: 0,
    };
  }
  return slice.reduce(
    (acc, p) => ({
      timestamp: slice[0].timestamp,
      solarKwh: acc.solarKwh + p.solarKwh,
      gridImportKwh: acc.gridImportKwh + p.gridImportKwh,
      gridExportKwh: acc.gridExportKwh + p.gridExportKwh,
      generatorKwh: acc.generatorKwh + p.generatorKwh,
      curtailedKwh: acc.curtailedKwh + p.curtailedKwh,
    }),
    {
      timestamp: slice[0].timestamp,
      solarKwh: 0,
      gridImportKwh: 0,
      gridExportKwh: 0,
      generatorKwh: 0,
      curtailedKwh: 0,
    },
  );
}

/** Roll consecutive daily buckets into 7-day weekly totals (executive view). */
export function bucketWeekly(daily: EnergyHistoryPoint[]): EnergyHistoryPoint[] {
  if (daily.length === 0) return [];
  const out: EnergyHistoryPoint[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const slice = daily.slice(i, i + 7);
    out.push(aggregateSlice(slice));
  }
  return out;
}

export function pointsForInterval(
  model: Pick<HistoryViewModel, 'today' | 'month' | 'year'>,
  interval: EnergyInterval,
): EnergyHistoryPoint[] {
  switch (interval) {
    case 'hourly':
      return model.today.points;
    case 'daily':
      return model.month.points;
    case 'weekly':
      return bucketWeekly(model.month.points);
    case 'monthly':
      return model.year.points;
    default:
      return model.today.points;
  }
}

export function formatAxisLabel(iso: string, interval: EnergyInterval): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  switch (interval) {
    case 'hourly':
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    case 'daily':
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    case 'weekly':
      return `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    case 'monthly':
      return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    default:
      return iso;
  }
}

export type EnergyChartRow = {
  name: string;
  solar: number;
  import: number;
  export: number;
  gen: number;
  curtailed: number;
};

export function toChartRows(points: EnergyHistoryPoint[], interval: EnergyInterval): EnergyChartRow[] {
  return points.map((p, idx) => ({
    name: formatAxisLabel(p.timestamp, interval) || `B${idx + 1}`,
    solar: p.solarKwh,
    import: p.gridImportKwh,
    export: p.gridExportKwh,
    gen: p.generatorKwh,
    curtailed: p.curtailedKwh,
  }));
}

export function peakSolar(points: EnergyHistoryPoint[]): number {
  return points.reduce((m, p) => Math.max(m, p.solarKwh), 0);
}
