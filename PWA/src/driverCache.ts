import type { DriverDefinition } from './types/driverLibrary';

const KEY_PREFIX = 'pvdg.driver.';

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

