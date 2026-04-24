import { useCallback, useEffect, useState } from 'react';
import {
  readStoredPreference,
  readStoredSchedule,
  resolveEffectiveTheme,
  writePreference,
  writeSchedule,
} from './resolveTheme';
import type { ThemePreference, ThemeSchedule } from './themeTypes';

const THEME_COLOR_LIGHT = '#134e4a';
const THEME_COLOR_DARK = '#0a1614';

function applyDomTheme(effective: 'light' | 'dark') {
  document.documentElement.dataset.theme = effective;
  document.documentElement.style.setProperty('color-scheme', effective);
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute(
    'content',
    effective === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT,
  );
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [schedule, setScheduleState] = useState<ThemeSchedule>(() => {
    const s = readStoredSchedule();
    return {
      lightStartHour: s.lightStartHour,
      lightEndHour: s.lightEndHour,
    };
  });

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    writePreference(p);
  }, []);

  const setSchedule = useCallback((next: ThemeSchedule) => {
    const normalized = {
      lightStartHour: Math.min(23, Math.max(0, Math.round(next.lightStartHour))),
      lightEndHour: Math.min(23, Math.max(0, Math.round(next.lightEndHour))),
    };
    setScheduleState(normalized);
    writeSchedule(normalized);
  }, []);

  const [effective, setEffective] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const prefers = window.matchMedia('(prefers-color-scheme: dark)');
    const compute = () => {
      const next = resolveEffectiveTheme(
        preference,
        schedule,
        prefers.matches,
        new Date(),
      );
      setEffective(next);
      applyDomTheme(next);
    };

    compute();

    const cleanups: Array<() => void> = [];

    if (preference === 'system') {
      const onChange = () => compute();
      prefers.addEventListener('change', onChange);
      cleanups.push(() => prefers.removeEventListener('change', onChange));
    }

    if (preference === 'schedule') {
      const id = window.setInterval(compute, 60_000);
      cleanups.push(() => clearInterval(id));
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [preference, schedule]);

  return {
    preference,
    setPreference,
    schedule,
    setSchedule,
    effective,
  };
}
