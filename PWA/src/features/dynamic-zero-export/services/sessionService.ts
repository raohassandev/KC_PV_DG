import { defaultSessionState, type SessionState, type PwaRole } from '../../../../../dynamic_zero_export/pwa';

const SESSION_KEY = 'dzx.session';

export function loadSession(): SessionState {
  if (typeof window === 'undefined') return defaultSessionState;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return defaultSessionState;
    return { ...defaultSessionState, ...(JSON.parse(raw) as Partial<SessionState>) };
  } catch {
    return defaultSessionState;
  }
}

export function saveSession(session: SessionState): SessionState {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  }
  return session;
}

export function updateRole(session: SessionState, role: PwaRole): SessionState {
  return { ...session, role };
}

