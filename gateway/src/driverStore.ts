import { mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { writeJsonAtomic } from './atomicFile.js';

export type DeviceType = 'meter' | 'inverter';

export type DriverRegister = {
  paramKey: string;
  label: string;
  unit?: string;
  registerType: 'read' | 'holding' | 'coil' | 'discrete_input';
  address: number;
  valueKind:
    | 'U_WORD'
    | 'S_WORD'
    | 'U_DWORD'
    | 'S_DWORD'
    | 'U_QWORD'
    | 'S_QWORD'
    | 'FP32';
  wordOrder?: 'normal' | 'lowWordFirst';
  byteOrder?: 'ABCD' | 'BADC' | 'CDAB' | 'DCBA';
  scale?: number;
  precision?: number;
};

export type DriverDefinition = {
  id: string;
  name: string;
  vendor?: string;
  deviceType: DeviceType;
  notes?: string;
  recommendedPollMs?: number;
  registers: DriverRegister[];
  createdAt?: string;
  updatedAt?: string;
};

export type DriverMeta = Pick<DriverDefinition, 'id' | 'name' | 'vendor' | 'deviceType' | 'updatedAt'>;

function safeDriverId(raw: string): string | null {
  const s = raw.trim();
  if (!s || s.length > 96) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null;
  return s;
}

function driversDir(configDir: string): string {
  return join(configDir, 'drivers');
}

export function listDrivers(configDir: string): DriverMeta[] {
  const dir = driversDir(configDir);
  try {
    const names = readdirSync(dir).filter((n) => n.endsWith('.json'));
    return names
      .map((n) => {
        const id = n.replace(/\.json$/i, '');
        const full = join(dir, n);
        try {
          const raw = readFileSync(full, 'utf8');
          const j = JSON.parse(raw) as Partial<DriverDefinition>;
          if (!j || typeof j !== 'object') return null;
          return {
            id,
            name: typeof j.name === 'string' ? j.name : id,
            vendor: typeof j.vendor === 'string' ? j.vendor : undefined,
            deviceType: j.deviceType === 'meter' || j.deviceType === 'inverter' ? j.deviceType : 'meter',
            updatedAt: typeof j.updatedAt === 'string' ? j.updatedAt : undefined,
          } satisfies DriverMeta;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as DriverMeta[];
  } catch {
    return [];
  }
}

export function getDriver(configDir: string, driverId: string): DriverDefinition | null {
  const id = safeDriverId(driverId);
  if (!id) return null;
  const full = join(driversDir(configDir), `${id}.json`);
  try {
    const raw = readFileSync(full, 'utf8');
    const j = JSON.parse(raw) as DriverDefinition;
    if (!j || typeof j !== 'object') return null;
    return { ...j, id };
  } catch {
    return null;
  }
}

export function saveDriver(configDir: string, driverId: string, def: DriverDefinition): DriverDefinition | null {
  const id = safeDriverId(driverId);
  if (!id) return null;
  const dir = driversDir(configDir);
  mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  const next: DriverDefinition = {
    ...def,
    id,
    createdAt: def.createdAt ?? now,
    updatedAt: now,
    registers: Array.isArray(def.registers) ? def.registers : [],
  };
  writeJsonAtomic(join(dir, `${id}.json`), next);
  return next;
}

export function deleteDriver(configDir: string, driverId: string): boolean {
  const id = safeDriverId(driverId);
  if (!id) return false;
  const full = join(driversDir(configDir), `${id}.json`);
  try {
    unlinkSync(full);
    return true;
  } catch {
    return false;
  }
}

