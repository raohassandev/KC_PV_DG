import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcrypt';
import { writeJsonAtomic } from './atomicFile.js';

export type AuthRecord = {
  user: { hash: string };
  installer: { hash: string };
  support_override: { hash: string };
  manufacturer: { hash: string };
};

const DEFAULT_PLAINTEXT = {
  user: process.env.INITIAL_USER_PASSWORD ?? 'DevUser!1',
  installer: process.env.INITIAL_INSTALLER_PASSWORD ?? 'DevInstall!1',
  support_override: process.env.INITIAL_SUPPORT_PASSWORD ?? 'DevSupport!1',
  manufacturer: process.env.INITIAL_MANUFACTURER_PASSWORD ?? 'DevMfg!1',
} as const;

function authPath(configDir: string) {
  return join(configDir, 'auth.json');
}

async function hash(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function loadOrInitAuth(configDir: string): Promise<AuthRecord> {
  mkdirSync(configDir, { recursive: true });
  const path = authPath(configDir);
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf8')) as AuthRecord;
  }
  const record: AuthRecord = {
    user: { hash: await hash(DEFAULT_PLAINTEXT.user) },
    installer: { hash: await hash(DEFAULT_PLAINTEXT.installer) },
    support_override: { hash: await hash(DEFAULT_PLAINTEXT.support_override) },
    manufacturer: { hash: await hash(DEFAULT_PLAINTEXT.manufacturer) },
  };
  writeJsonAtomic(path, record);
  return record;
}

export function saveAuth(configDir: string, record: AuthRecord): void {
  writeJsonAtomic(authPath(configDir), record);
}

export type LoginChannel = 'user' | 'installer' | 'manufacturer';

export async function verifyLogin(
  record: AuthRecord,
  channel: LoginChannel,
  password: string,
): Promise<{ ok: boolean; usedOverride: boolean }> {
  if (channel === 'manufacturer') {
    const ok = await bcrypt.compare(password, record.manufacturer.hash);
    return { ok, usedOverride: false };
  }
  const roleHash = channel === 'user' ? record.user.hash : record.installer.hash;
  if (await bcrypt.compare(password, roleHash)) {
    return { ok: true, usedOverride: false };
  }
  if (await bcrypt.compare(password, record.support_override.hash)) {
    return { ok: true, usedOverride: true };
  }
  return { ok: false, usedOverride: false };
}

export type CredentialSlot = keyof AuthRecord;

export async function changeOwnPassword(
  record: AuthRecord,
  slot: CredentialSlot,
  currentPlain: string,
  newPlain: string,
): Promise<{ ok: true; record: AuthRecord } | { ok: false; reason: string }> {
  const currentHash = record[slot].hash;
  if (!(await bcrypt.compare(currentPlain, currentHash))) {
    return { ok: false, reason: 'current_password_mismatch' };
  }
  const next: AuthRecord = {
    ...record,
    [slot]: { hash: await hash(newPlain) },
  };
  return { ok: true, record: next };
}

/** Set a credential slot to a new password (no current-password check) — manufacturer admin only. */
export async function setSlotPasswordPlain(
  record: AuthRecord,
  slot: CredentialSlot,
  newPlain: string,
): Promise<AuthRecord> {
  return { ...record, [slot]: { hash: await hash(newPlain) } };
}
