export type ThemePreference = 'light' | 'dark' | 'system' | 'schedule';

export type ThemeSchedule = {
  /** Local hour (0–23) when light theme starts (inclusive). */
  lightStartHour: number;
  /** Local hour (0–23) when light theme ends (exclusive, half-open interval). */
  lightEndHour: number;
};

export const DEFAULT_THEME_SCHEDULE: ThemeSchedule = {
  lightStartHour: 7,
  lightEndHour: 19,
};
