import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeJsonAtomic } from './atomicFile.js';

export type SessionRecord = {
  role: 'user' | 'installer' | 'manufacturer';
  siteId: string;
  locale: string;
  accessMode: 'local' | 'remote';
  installerId?: string;
  issuedAt: number;
};

const sessions = new Map<string, SessionRecord>();

type SessionsFile = { version: 1; sessions: Record<string, SessionRecord> };

let configDir: string | null = null;

function sessionsFile(): string {
  if (!configDir) throw new Error('configureSessionPersistence() not called');
  return join(configDir, 'sessions.json');
}

function isValidRecord(rec: unknown): rec is SessionRecord {
  if (!rec || typeof rec !== 'object') return false;
  const r = rec as SessionRecord;
  if (r.role !== 'user' && r.role !== 'installer' && r.role !== 'manufacturer') return false;
  if (typeof r.siteId !== 'string' || typeof r.locale !== 'string') return false;
  if (r.accessMode !== 'local' && r.accessMode !== 'remote') return false;
  if (typeof r.issuedAt !== 'number') return false;
  if (r.installerId !== undefined && typeof r.installerId !== 'string') return false;
  return true;
}

/** Call once at process start with the same CONFIG_DIR as auth/sites. */
export function configureSessionPersistence(dir: string): void {
  configDir = dir;
  hydrateFromDisk();
}

function hydrateFromDisk(): void {
  if (!configDir) return;
  const path = sessionsFile();
  if (!existsSync(path)) return;
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as SessionsFile;
    const o = raw?.sessions;
    if (!o || typeof o !== 'object') return;
    for (const [token, rec] of Object.entries(o)) {
      if (!isValidRecord(rec)) continue;
      sessions.set(token, rec);
    }
  } catch {
    /* corrupt file — start empty */
  }
}

function persistToDisk(): void {
  if (!configDir) return;
  const out: Record<string, SessionRecord> = {};
  for (const [k, v] of sessions) out[k] = v;
  writeJsonAtomic(sessionsFile(), { version: 1, sessions: out });
}

export function createSession(rec: Omit<SessionRecord, 'issuedAt'>): string {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { ...rec, issuedAt: Date.now() });
  persistToDisk();
  return token;
}

export function getSession(token: string | undefined): SessionRecord | undefined {
  if (!token) return undefined;
  return sessions.get(token);
}

export function deleteSession(token: string | undefined): void {
  if (!token) return;
  if (sessions.delete(token)) persistToDisk();
}
