import type { EnergyHistorySeries, EnergyHistoryViewModel } from '../contracts/history';

export function buildEnergyHistoryViewModel(
  today: EnergyHistorySeries,
  month: EnergyHistorySeries,
  lifetime: EnergyHistorySeries,
): EnergyHistoryViewModel {
  return {
    today,
    month,
    lifetime,
    highlights: [
      `Today points: ${today.points.length}`,
      `Month points: ${month.points.length}`,
      `Lifetime points: ${lifetime.points.length}`,
    ],
  };
}

