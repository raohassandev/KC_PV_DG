import {
  buildAlertViewModel,
  summarizeAlertFeed,
  type AlertFeed,
  type PwaRole,
} from '../../../../../dynamic_zero_export/pwa';
import { alertsFixture } from '../mock/alerts';
import { createDzxProvider, type ProviderMode } from './provider';

const ALERTS_KEY = 'dzx.alerts';
const ALERTS_PROVIDER_KEY = 'dzx.alertsProviderMode';

export function loadAlertFeed(): AlertFeed {
  if (typeof window === 'undefined') return alertsFixture;
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) return alertsFixture;
    return { ...alertsFixture, ...(JSON.parse(raw) as Partial<AlertFeed>) } as AlertFeed;
  } catch {
    return alertsFixture;
  }
}

export function saveAlertFeed(feed: AlertFeed): AlertFeed {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ALERTS_KEY, JSON.stringify(feed));
    } catch {
      // ignore
    }
  }
  return feed;
}

export function loadAlertsProviderMode(): ProviderMode {
  if (typeof window === 'undefined') return 'auto';
  const stored = localStorage.getItem(ALERTS_PROVIDER_KEY);
  if (stored === 'api' || stored === 'mock' || stored === 'auto') return stored;
  return 'auto';
}

export function saveAlertsProviderMode(mode: ProviderMode): ProviderMode {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ALERTS_PROVIDER_KEY, mode);
    } catch {
      // ignore
    }
  }
  return mode;
}

export async function loadAlertFeedFromProvider(mode: ProviderMode = loadAlertsProviderMode()) {
  const provider = createDzxProvider(mode);
  const feed = await provider.loadAlerts('user');
  return saveAlertFeed(feed);
}

export function buildAlertsViewModel(role: PwaRole, feed = loadAlertFeed()) {
  return {
    role,
    feed,
    summary: summarizeAlertFeed(feed),
    view: buildAlertViewModel(feed, role),
  };
}

export async function buildAlertsViewModelFromProvider(role: PwaRole, mode: ProviderMode = loadAlertsProviderMode()) {
  const feed = await loadAlertFeedFromProvider(mode);
  return buildAlertsViewModel(role, feed);
}
