import {
  buildAlertViewModel,
  summarizeAlertFeed,
  type AlertFeed,
  type PwaRole,
} from '../../../../../dynamic_zero_export/pwa';
import { emptyAlertFeed } from '../emptyMonitoringState';
import { createDzxProvider, type ProviderMode } from './provider';
import { loadProviderMode } from './liveStatusService';

const ALERTS_KEY = 'dzx.alerts';

function baseFeed(): AlertFeed {
  return emptyAlertFeed();
}

export function loadAlertFeed(): AlertFeed {
  if (typeof window === 'undefined') return baseFeed();
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) return baseFeed();
    return { ...baseFeed(), ...(JSON.parse(raw) as Partial<AlertFeed>) } as AlertFeed;
  } catch {
    return baseFeed();
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

export async function loadAlertFeedFromProvider(mode: ProviderMode = loadProviderMode()) {
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

export async function buildAlertsViewModelFromProvider(role: PwaRole, mode: ProviderMode = loadProviderMode()) {
  const feed = await loadAlertFeedFromProvider(mode);
  return buildAlertsViewModel(role, feed);
}
