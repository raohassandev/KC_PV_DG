import type { ThemePreference, ThemeSchedule } from '../theme/themeTypes';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

type ThemeControlsProps = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  schedule: ThemeSchedule;
  setSchedule: (s: ThemeSchedule) => void;
  effective: 'light' | 'dark';
};

export function ThemeControls({
  preference,
  setPreference,
  schedule,
  setSchedule,
  effective,
}: ThemeControlsProps) {
  return (
    <div
      className='theme-controls'
      role='group'
      aria-label='Appearance and theme'
    >
      <label className='theme-controls__field'>
        <span className='theme-controls__label'>Theme</span>
        <select
          className='theme-controls__select'
          value={preference}
          onChange={(e) => setPreference(e.target.value as ThemePreference)}
          data-testid='theme-preference-select'
          aria-describedby='theme-effective-hint'
        >
          <option value='light'>Light</option>
          <option value='dark'>Dark</option>
          <option value='system'>Match system</option>
          <option value='schedule'>By local time</option>
        </select>
      </label>
      {preference === 'schedule' ? (
        <div className='theme-controls__schedule' data-testid='theme-schedule-row'>
          <label className='theme-controls__field theme-controls__field--narrow'>
            <span className='theme-controls__label'>Light from (hour)</span>
            <select
              className='theme-controls__select'
              value={schedule.lightStartHour}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  lightStartHour: Number(e.target.value),
                })
              }
              data-testid='theme-schedule-start'
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
          <label className='theme-controls__field theme-controls__field--narrow'>
            <span className='theme-controls__label'>Until (hour, exclusive)</span>
            <select
              className='theme-controls__select'
              value={schedule.lightEndHour}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  lightEndHour: Number(e.target.value),
                })
              }
              data-testid='theme-schedule-end'
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      <p id='theme-effective-hint' className='theme-controls__hint'>
        Active: {effective === 'dark' ? 'Dark' : 'Light'}
        {preference === 'schedule'
          ? ' (local clock; updates every minute)'
          : preference === 'system'
            ? ' (follows OS)'
            : null}
      </p>
    </div>
  );
}
