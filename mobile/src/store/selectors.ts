import { createSelector } from '@reduxjs/toolkit';
import { buildLiveDashboard } from '../features/dashboard/buildLiveDashboard';
import type { RootState } from './index';

export const selectDashboardViewModel = createSelector(
  [(s: RootState) => s.dashboard.snapshot, (s: RootState) => s.siteConfig.config.slots, (s: RootState) => s.siteConfig.config.boardIp],
  (snapshot, slots, boardIp) => buildLiveDashboard(snapshot, slots, boardIp),
);

export const selectSiteGatewaySyncAvailable = createSelector(
  [(s: RootState) => s.auth.gatewayUrl, (s: RootState) => s.auth.token, (s: RootState) => s.auth.authenticated, (s: RootState) => s.auth.role],
  (gatewayUrl, token, authenticated, role) => {
    if (!gatewayUrl.trim() || !authenticated || !token?.trim()) return false;
    return role === 'installer' || role === 'manufacturer';
  },
);
