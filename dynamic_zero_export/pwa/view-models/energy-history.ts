import type { EnergyHistorySeries, EnergyHistoryViewModel } from '../contracts/history';

export function buildEnergyHistoryViewModel(
  today: EnergyHistorySeries,
  month: EnergyHistorySeries,
  year: EnergyHistorySeries,
  decade: EnergyHistorySeries,
): EnergyHistoryViewModel {
  return {
    today,
    month,
    year,
    decade,
    highlights: [
      `Day (hourly) points: ${today.points.length}`,
      `Month (daily) points: ${month.points.length}`,
      `Year (monthly) points: ${year.points.length}`,
      `Decade (yearly) points: ${decade.points.length}`,
    ],
  };
}

