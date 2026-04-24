import { useId } from 'react';
import { HelpHint } from './HelpHint';

export function TextField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hintId = useId();
  return (
    <label className='field'>
      <span className='field-label field-label--with-hint'>
        <span className='field-label-text'>{label}</span>
        {help ? <HelpHint id={hintId} text={help} /> : null}
      </span>
      <input
        className='field-input'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={help ? hintId : undefined}
      />
    </label>
  );
}

export function NumberField({
  label,
  help,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  const hintId = useId();
  return (
    <label className='field'>
      <span className='field-label field-label--with-hint'>
        <span className='field-label-text'>{label}</span>
        {help ? <HelpHint id={hintId} text={help} /> : null}
      </span>
      <input
        className='field-input'
        type='number'
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={help ? hintId : undefined}
      />
    </label>
  );
}

export function SelectField({
  label,
  help,
  value,
  onChange,
  options,
  dataTestId,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
  dataTestId?: string;
}) {
  const hintId = useId();
  return (
    <label className='field'>
      <span className='field-label field-label--with-hint'>
        <span className='field-label-text'>{label}</span>
        {help ? <HelpHint id={hintId} text={help} /> : null}
      </span>
      <select
        className='field-select'
        value={value}
        data-testid={dataTestId}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={help ? hintId : undefined}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ToggleField({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const hintId = useId();
  return (
    <label className='field'>
      <span className='field-label field-label--with-hint'>
        <span className='field-label-text'>{label}</span>
        {help ? <HelpHint id={hintId} text={help} /> : null}
      </span>
      <button
        type='button'
        onClick={() => onChange(!checked)}
        className={`toggle-button ${checked ? 'enabled' : 'disabled'}`}
        aria-pressed={checked}
        aria-describedby={help ? hintId : undefined}
      >
        {checked ? 'Enabled' : 'Disabled'}
      </button>
    </label>
  );
}
