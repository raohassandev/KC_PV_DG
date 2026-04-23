import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { defaultSessionState, type SessionState } from '../../../dynamic_zero_export/pwa';
import { resolveRole } from '../features/dynamic-zero-export/roles';

const AUTH_KEY = 'pvdg.auth';
const DZX_KEY = 'dzx.session';

export type LoginChannel = 'user' | 'installer' | 'manufacturer';

type StoredAuth = {
  token?: string;
  session: SessionState;
  installerId?: string;
};

type AuthContextValue = {
  session: SessionState;
  role: ReturnType<typeof resolveRole>;
  authenticated: boolean;
  login: (
    channel: LoginChannel,
    password: string,
    opts?: { installerId?: string; siteId?: string },
  ) => Promise<void>;
  /** Updates password on the gateway (requires `VITE_GATEWAY_URL` and a valid bearer token). */
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function writeStored(s: StoredAuth | null) {
  if (!s) {
    localStorage.removeItem(AUTH_KEY);
    return;
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(s));
}

function syncDzxSession(session: SessionState) {
  try {
    const prev = localStorage.getItem(DZX_KEY);
    const base = prev ? ({ ...defaultSessionState, ...JSON.parse(prev) } as SessionState) : { ...defaultSessionState };
    const next = { ...base, ...session, role: session.role };
    localStorage.setItem(DZX_KEY, JSON.stringify(next));
  } catch {
    localStorage.setItem(
      DZX_KEY,
      JSON.stringify({ ...defaultSessionState, ...session }),
    );
  }
}

const gatewayUrl = (import.meta.env.VITE_GATEWAY_URL as string | undefined)?.replace(/\/$/, '');

const devPasswords: Record<LoginChannel, string> = {
  user: (import.meta.env.VITE_DEV_AUTH_USER as string) || 'DevUser!1',
  installer: (import.meta.env.VITE_DEV_AUTH_INSTALLER as string) || 'DevInstall!1',
  manufacturer: (import.meta.env.VITE_DEV_AUTH_MANUFACTURER as string) || 'DevMfg!1',
};

const devSupportOverride =
  (import.meta.env.VITE_DEV_AUTH_SUPPORT as string) || 'DevSupport!1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(() => readStored()?.session ?? defaultSessionState);
  const [error, setError] = useState<string | null>(null);

  const authenticated = session.authenticated === true;

  const role = useMemo(() => resolveRole(session.role), [session.role]);

  const logout = useCallback(() => {
    writeStored(null);
    setSession({ ...defaultSessionState });
    try {
      localStorage.removeItem(DZX_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!gatewayUrl) {
        return { ok: false, message: 'Password change requires the gateway (set VITE_GATEWAY_URL).' };
      }
      const stored = readStored();
      if (!stored?.token || stored.token === 'local-dev') {
        return { ok: false, message: 'Not signed in with gateway token.' };
      }
      const res = await fetch(`${gatewayUrl}/api/auth/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stored.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, message: err.error ?? 'Password change failed' };
      }
      return { ok: true };
    },
    [],
  );

  const login = useCallback(
    async (channel: LoginChannel, password: string, opts?: { installerId?: string; siteId?: string }) => {
      setError(null);
      if (gatewayUrl) {
        const res = await fetch(`${gatewayUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel,
            password,
            siteId: opts?.siteId,
            installerId: opts?.installerId,
          }),
        });
        if (!res.ok) {
          setError('Login failed');
          return;
        }
        const data = (await res.json()) as {
          token: string;
          session: SessionState;
          installerId?: string | null;
        };
        const nextSession: SessionState = {
          ...data.session,
          authenticated: true,
          role: data.session.role,
        };
        const stored: StoredAuth = {
          token: data.token,
          session: nextSession,
          installerId: opts?.installerId ?? data.installerId ?? undefined,
        };
        writeStored(stored);
        setSession(nextSession);
        syncDzxSession(nextSession);
        return;
      }

      // Local dev auth (no VPS): plaintext compare — only for development builds.
      if (!import.meta.env.DEV) {
        setError('Gateway not configured');
        return;
      }
      let ok = false;
      let usedOverride = false;
      if (channel === 'manufacturer') {
        ok = password === devPasswords.manufacturer;
      } else if (password === devPasswords[channel]) {
        ok = true;
      } else if (password === devSupportOverride) {
        ok = true;
        usedOverride = true;
      }
      if (!ok) {
        setError('Invalid credentials');
        return;
      }
      const siteId = opts?.siteId ?? 'site-001';
      const nextSession: SessionState = {
        ...defaultSessionState,
        role: channel,
        siteId,
        authenticated: true,
        accessMode: 'local',
      };
      const stored: StoredAuth = {
        token: 'local-dev',
        session: nextSession,
        installerId: opts?.installerId,
      };
      writeStored(stored);
      setSession(nextSession);
      syncDzxSession(nextSession);
      if (usedOverride) {
        // eslint-disable-next-line no-console
        console.info('[auth] dev login used support override', channel);
      }
    },
    [],
  );

  useEffect(() => {
    if (!gatewayUrl) return;
    const s = readStored();
    if (!s?.token) return;
    void (async () => {
      const res = await fetch(`${gatewayUrl}/api/session`, {
        headers: { Authorization: `Bearer ${s.token}` },
      });
      if (!res.ok) {
        logout();
        return;
      }
      const remote = (await res.json()) as SessionState;
      const next = { ...remote, authenticated: remote.authenticated };
      writeStored({ ...s, session: next });
      setSession(next);
      syncDzxSession(next);
    })();
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      role,
      authenticated,
      login,
      changePassword,
      logout,
      error,
    }),
    [session, role, authenticated, login, changePassword, logout, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
