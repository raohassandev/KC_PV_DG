import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SiteConfig } from '../domain/siteProfileSchema';
import type { ConnectionState } from './slices/connectionSlice';
import type { AuthState } from './slices/authSlice';

const KEY_SITE = 'pvdg.mobile.siteConfig';
const KEY_CONN = 'pvdg.mobile.connection';
const KEY_AUTH = 'pvdg.mobile.auth';

export type PersistedAuth = Pick<
  AuthState,
  'gatewayUrl' | 'token' | 'role' | 'siteId' | 'installerId' | 'authenticated' | 'gatewaySyncSiteId'
>;

export async function loadPersisted(): Promise<{
  site: SiteConfig | null;
  connection: Partial<ConnectionState> | null;
  auth: Partial<AuthState> | null;
}> {
  try {
    const [rawSite, rawConn, rawAuth] = await Promise.all([
      AsyncStorage.getItem(KEY_SITE),
      AsyncStorage.getItem(KEY_CONN),
      AsyncStorage.getItem(KEY_AUTH),
    ]);
    return {
      site: rawSite ? (JSON.parse(rawSite) as SiteConfig) : null,
      connection: rawConn ? (JSON.parse(rawConn) as Partial<ConnectionState>) : null,
      auth: rawAuth ? (JSON.parse(rawAuth) as Partial<AuthState>) : null,
    };
  } catch {
    return { site: null, connection: null, auth: null };
  }
}

export async function persistAll(payload: {
  site: SiteConfig;
  connection: Pick<ConnectionState, 'boardBaseUrl' | 'lastGoodBoardIp' | 'probeDraft' | 'controllerToken'>;
  auth: PersistedAuth;
}) {
  try {
    await AsyncStorage.multiSet([
      [KEY_SITE, JSON.stringify(payload.site)],
      [KEY_CONN, JSON.stringify(payload.connection)],
      [KEY_AUTH, JSON.stringify(payload.auth)],
    ]);
  } catch {
    /* ignore */
  }
}
