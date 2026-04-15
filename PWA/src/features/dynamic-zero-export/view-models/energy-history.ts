import {
  aggregateEnergy,
  type EnergyHistorySeries,
} from '../../../../../dynamic_zero_export/pwa';

export function buildEnergyHistoryViewModel(
  today: EnergyHistorySeries,
  month: EnergyHistorySeries,
  lifetime: EnergyHistorySeries,
) {
  return {
    today,
    month,
    lifetime,
    totals: {
      today: aggregateEnergy(today.points),
      month: aggregateEnergy(month.points),
      lifetime: aggregateEnergy(lifetime.points),
    },
    highlights: [
      `Today points: ${today.points.length}`,
      `Month points: ${month.points.length}`,
      `Lifetime points: ${lifetime.points.length}`,
    ],
  };
}
