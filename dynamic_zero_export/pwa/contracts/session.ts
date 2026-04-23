import type { PwaRole } from '../roles.js';

export type SessionState = {
  role: PwaRole;
  userId?: string;
  siteId: string;
  locale: string;
  authenticated: boolean;
  accessMode: 'local' | 'remote';
};

export const defaultSessionState: SessionState = {
  role: 'user',
  siteId: 'site-001',
  locale: 'en',
  authenticated: false,
  accessMode: 'local',
};

