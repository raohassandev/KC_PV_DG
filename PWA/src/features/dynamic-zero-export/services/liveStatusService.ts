import {
  buildInstallerDashboard,
  buildManufacturerDashboard,
  buildUserDashboard,
  type DashboardModel,
  type LiveStatusSnapshot,
  type PwaRole,
} from '../../../../../dynamic_zero_export/pwa';
import { liveStatusFixture } from '../mock/liveStatus';
import { createDzxProvider, type ProviderMode } from './provider';

const LIVE_KEY = 'dzx.liveStatus';
const PROVIDER_KEY = 'dzx.providerMode';
const LEGACY_PROVIDER_KEYS = [
  'dzx.connectivityProviderMode',
  'dzx.alertsProviderMode',
  'dzx.historyProviderMode',
] as const;

export function loadLiveStatus(): LiveStatusSnapshot {
  if (typeof window === 'undefined') return liveStatusFixture;
  try {
    const raw = localStorage.getItem(LIVE_KEY);
    if (!raw) return liveStatusFixture;
    return { ...liveStatusFixture, ...(JSON.parse(raw) as Partial<LiveStatusSnapshot>) };
  } catch {
    return liveStatusFixture;
  }
}

export function saveLiveStatus(snapshot: LiveStatusSnapshot): LiveStatusSnapshot {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LIVE_KEY, JSON.stringify(snapshot));
    } catch {
      // ignore
    }
  }
  return snapshot;
}

export function loadProviderMode(): ProviderMode {
  if (typeof window === 'undefined') return 'auto';
  const stored = localStorage.getItem(PROVIDER_KEY);
  if (stored === 'api' || stored === 'mock' || stored === 'auto') return stored;
  for (const key of LEGACY_PROVIDER_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy === 'api' || legacy === 'mock' || legacy === 'auto') {
      try {
        localStorage.setItem(PROVIDER_KEY, legacy);
        for (const k of LEGACY_PROVIDER_KEYS) {
          localStorage.removeItem(k);
        }
      } catch {
        // ignore
      }
      return legacy;
    }
  }
  return 'auto';
}

export function saveProviderMode(mode: ProviderMode): ProviderMode {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PROVIDER_KEY, mode);
      for (const k of LEGACY_PROVIDER_KEYS) {
        localStorage.removeItem(k);
      }
    } catch {
      // ignore
    }
  }
  return mode;
}

export async function loadLiveStatusFromProvider(role: PwaRole, mode: ProviderMode = loadProviderMode()) {
  const provider = createDzxProvider(mode);
  const snapshot = await provider.loadLiveStatus(role);
  return saveLiveStatus(snapshot);
}

export function buildOverviewModel(role: PwaRole, snapshot = loadLiveStatus()): DashboardModel {
  if (role === 'installer') return buildInstallerDashboard(snapshot);
  if (role === 'manufacturer') return buildManufacturerDashboard(snapshot);
  return buildUserDashboard(snapshot);
}

export function buildRoleAwareLiveStatus(role: PwaRole, snapshot = loadLiveStatus()) {
  const model = buildOverviewModel(role, snapshot);
  return {
    role,
    snapshot,
    model,
    lastUpdatedAt: snapshot.lastUpdatedAt,
    activeAlertCount: snapshot.alertsCount,
    currentPowerKw: snapshot.powerKw,
    solarKw: snapshot.solarKw,
    gridImportKw: snapshot.gridImportKw,
    gridExportKw: snapshot.gridExportKw,
    generatorKw: snapshot.generatorKw ?? 0,
    summary: model.summary,
  };
}

export async function buildRoleAwareLiveStatusFromProvider(role: PwaRole, mode: ProviderMode = loadProviderMode()) {
  const snapshot = await loadLiveStatusFromProvider(role, mode);
  return buildRoleAwareLiveStatus(role, snapshot);
}
