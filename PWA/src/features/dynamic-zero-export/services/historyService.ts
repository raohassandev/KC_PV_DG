import {
  aggregateEnergy,
  type EnergyHistorySeries,
  type PwaRole,
} from '../../../../../dynamic_zero_export/pwa';
import {
  lifetimeHistoryFixture,
  monthHistoryFixture,
  todayHistoryFixture,
} from '../mock/history';
import { aggregateEnergyTotals } from '../types';
import { createDzxProvider, type ProviderMode } from './provider';
import { loadProviderMode } from './liveStatusService';

const HISTORY_KEY = 'dzx.history';

export type HistoryBundle = {
  today: EnergyHistorySeries;
  month: EnergyHistorySeries;
  lifetime: EnergyHistorySeries;
};

export function loadHistoryBundle(): HistoryBundle {
  if (typeof window === 'undefined') {
    return {
      today: todayHistoryFixture,
      month: monthHistoryFixture,
      lifetime: lifetimeHistoryFixture,
    };
  }
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return {
        today: todayHistoryFixture,
        month: monthHistoryFixture,
        lifetime: lifetimeHistoryFixture,
      };
    }
    return JSON.parse(raw) as HistoryBundle;
  } catch {
    return {
      today: todayHistoryFixture,
      month: monthHistoryFixture,
      lifetime: lifetimeHistoryFixture,
    };
  }
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
      lifetime: aggregateEnergyTotals(bundle.lifetime.points),
    },
    highlights: [
      `Role: ${role}`,
      `Today solar: ${aggregateEnergy(bundle.today.points).solarKwh.toFixed(2)} kWh`,
      `Month solar: ${aggregateEnergy(bundle.month.points).solarKwh.toFixed(2)} kWh`,
      `Lifetime solar: ${aggregateEnergy(bundle.lifetime.points).solarKwh.toFixed(2)} kWh`,
    ],
  };
}

export async function buildHistoryViewModelFromProvider(role: PwaRole, mode: ProviderMode = loadProviderMode()) {
  const bundle = await loadHistoryBundleFromProvider(mode);
  return buildHistoryViewModel(role, bundle);
}
