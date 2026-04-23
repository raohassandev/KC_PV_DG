import { randomBytes } from 'node:crypto';

export type SessionRecord = {
  role: 'user' | 'installer' | 'manufacturer';
  siteId: string;
  locale: string;
  accessMode: 'local' | 'remote';
  installerId?: string;
  issuedAt: number;
};

const sessions = new Map<string, SessionRecord>();

export function createSession(rec: Omit<SessionRecord, 'issuedAt'>): string {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { ...rec, issuedAt: Date.now() });
  return token;
}

export function getSession(token: string | undefined): SessionRecord | undefined {
  if (!token) return undefined;
  return sessions.get(token);
}

export function deleteSession(token: string | undefined): void {
  if (!token) return;
  sessions.delete(token);
}
