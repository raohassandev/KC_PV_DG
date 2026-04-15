import { useEffect, useMemo, useState } from 'react';
import { defaultSessionState, type SessionState } from '../../../../../dynamic_zero_export/pwa';
import { resolveRole } from '../roles';

export function useFeatureSession() {
  const [session, setSession] = useState<SessionState>(() => {
    try {
      const raw = localStorage.getItem('dzx.session');
      if (raw) {
        return { ...defaultSessionState, ...(JSON.parse(raw) as Partial<SessionState>) };
      }
    } catch {
      // ignore
    }
    return defaultSessionState;
  });

  useEffect(() => {
    try {
      localStorage.setItem('dzx.session', JSON.stringify(session));
    } catch {
      // ignore
    }
  }, [session]);

  const role = useMemo(() => resolveRole(session.role), [session.role]);

  return {
    session: { ...session, role },
    setSession,
    role,
  };
}

