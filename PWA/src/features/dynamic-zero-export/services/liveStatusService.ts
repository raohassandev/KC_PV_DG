import {
  buildInstallerDashboard,
  buildManufacturerDashboard,
  buildUserDashboard,
  type DashboardModel,
  type LiveStatusSnapshot,
  type PwaRole,
} from '../../../../../dynamic_zero_export/pwa';
import { liveStatusFixture } from '../mock/liveStatus';

const LIVE_KEY = 'dzx.liveStatus';

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

