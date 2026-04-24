import type { ThemePreference, ThemeSchedule } from './themeTypes';
import { DEFAULT_THEME_SCHEDULE } from './themeTypes';

const STORAGE_PREF = 'pvdg.themePreference';
const STORAGE_SCHEDULE = 'pvdg.themeSchedule';

export function readStoredPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_PREF);
    if (
      raw === 'light' ||
      raw === 'dark' ||
      raw === 'system' ||
      raw === 'schedule'
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return 'system';
}

export function readStoredSchedule(): ThemeSchedule {
  try {
    const raw = localStorage.getItem(STORAGE_SCHEDULE);
    if (!raw) return { ...DEFAULT_THEME_SCHEDULE };
    const o = JSON.parse(raw) as Partial<ThemeSchedule>;
    const lightStartHour = clampHour(
      o.lightStartHour,
      DEFAULT_THEME_SCHEDULE.lightStartHour,
    );
    const lightEndHour = clampHour(
      o.lightEndHour,
      DEFAULT_THEME_SCHEDULE.lightEndHour,
    );
    return { lightStartHour, lightEndHour };
  } catch {
    return { ...DEFAULT_THEME_SCHEDULE };
  }
}

function clampHour(n: unknown, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(23, Math.max(0, Math.round(n)));
}

export function writePreference(p: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_PREF, p);
  } catch {
    /* ignore */
  }
}

export function writeSchedule(s: ThemeSchedule): void {
  try {
    localStorage.setItem(STORAGE_SCHEDULE, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** True when local hour is inside the light window [start, end) with optional midnight wrap. */
export function hourInLightWindow(
  hour: number,
  { lightStartHour: start, lightEndHour: end }: ThemeSchedule,
): boolean {
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

export function resolveEffectiveTheme(
  preference: ThemePreference,
  schedule: ThemeSchedule,
  prefersDark: boolean,
  now: Date = new Date(),
): 'light' | 'dark' {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  const h = now.getHours();
  return hourInLightWindow(h, schedule) ? 'light' : 'dark';
}
