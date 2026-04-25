import {
  aggregateEnergy,
  type EnergyHistorySeries,
  type PwaRole,
} from '../../../../../dynamic_zero_export/pwa';
import {
  decadeHistoryFixture,
  monthHistoryFixture,
  todayHistoryFixture,
  yearHistoryFixture,
} from '../mock/history';
import { aggregateEnergyTotals } from '../types';
import { createDzxProvider, type ProviderMode } from './provider';
import { loadProviderMode } from './liveStatusService';

const HISTORY_KEY = 'dzx.history';

export type HistoryBundle = {
  today: EnergyHistorySeries;
  month: EnergyHistorySeries;
  year: EnergyHistorySeries;
  decade: EnergyHistorySeries;
};

function defaultBundle(): HistoryBundle {
  return {
    today: todayHistoryFixture,
    month: monthHistoryFixture,
    year: yearHistoryFixture,
    decade: decadeHistoryFixture,
  };
}

function isHistoryBundle(value: unknown): value is HistoryBundle {
  if (!value || typeof value !== 'object') return false;
  const b = value as Record<string, unknown>;
  if (!b.today || !b.month || !b.year || !b.decade) return false;
  return (
    typeof b.today === 'object' &&
    typeof b.month === 'object' &&
    typeof b.year === 'object' &&
    typeof b.decade === 'object'
  );
}

export function loadHistoryBundle(): HistoryBundle {
  if (typeof window === 'undefined') {
    return defaultBundle();
  }
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return defaultBundle();
    const parsed = JSON.parse(raw) as unknown;
    if (isHistoryBundle(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return defaultBundle();
}

export function saveHistoryBundle(bundle: HistoryBundle): HistoryBundle {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(bundle));
    } catch {
      // ignore
    }
  }
  return bundle;
}

export async function loadHistoryBundleFromProvider(mode: ProviderMode = loadProviderMode()): Promise<HistoryBundle> {
  const provider = createDzxProvider(mode);
  const bundle = await provider.loadHistory('user');
  return saveHistoryBundle(bundle);
}

export function buildHistoryViewModel(role: PwaRole, bundle = loadHistoryBundle()) {
  return {
    role,
    ...bundle,
    totals: {
      today: aggregateEnergyTotals(bundle.today.points),
      month: aggregateEnergyTotals(bundle.month.points),
      year: aggregateEnergyTotals(bundle.year.points),
      decade: aggregateEnergyTotals(bundle.decade.points),
    },
    highlights: [
      `Role: ${role}`,
      `Day (hourly) solar: ${aggregateEnergy(bundle.today.points).solarKwh.toFixed(2)} kWh`,
      `Month (daily) solar: ${aggregateEnergy(bundle.month.points).solarKwh.toFixed(2)} kWh`,
      `Year (monthly) solar: ${aggregateEnergy(bundle.year.points).solarKwh.toFixed(2)} kWh`,
      `Ten years (yearly) solar: ${aggregateEnergy(bundle.decade.points).solarKwh.toFixed(2)} kWh`,
    ],
  };
}

export async function buildHistoryViewModelFromProvider(role: PwaRole, mode: ProviderMode = loadProviderMode()) {
  const bundle = await loadHistoryBundleFromProvider(mode);
  return buildHistoryViewModel(role, bundle);
}
