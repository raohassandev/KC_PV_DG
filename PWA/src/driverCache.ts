import type { DriverDefinition, DriverMeta } from './types/driverLibrary';

const KEY_PREFIX = 'pvdg.driver.';
const META_KEY = 'pvdg.driver.meta.list';

export function cacheDriver(def: DriverDefinition) {
  try {
    if (!def?.id) return;
    localStorage.setItem(`${KEY_PREFIX}${def.id}`, JSON.stringify(def));
  } catch {
    // ignore
  }
}

export function readCachedDriver(driverId: string): DriverDefinition | null {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${driverId}`);
    if (!raw) return null;
    return JSON.parse(raw) as DriverDefinition;
  } catch {
    return null;
  }
}

export function cacheDriverMetaList(list: DriverMeta[]) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function readCachedDriverMetaList(): DriverMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as unknown;
    return Array.isArray(j) ? (j as DriverMeta[]) : [];
  } catch {
    return [];
  }
}

