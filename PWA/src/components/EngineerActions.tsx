import { useState } from 'react';
import { FormGrid } from '../layout/FormGrid';
import {
  applyControllerSettings,
  setControlMode,
  setControllerEnable,
  setGridMeterEnable,
  setInverterEnable,
  setInverterWriteEnable,
} from '../boardWriteApi';
import { controllerModeHelp, controlFieldHelp } from '../siteTemplates';

type Props = {
  boardIp: string;
};

type FormState = {
  controllerEnable: boolean;
  gridMeterEnable: boolean;
  inverterEnable: boolean;
  inverterWriteEnable: boolean;
  controlMode:
    | 'disabled'
    | 'grid_zero_export'
    | 'grid_limited_export'
    | 'grid_limited_import';
  exportLimitKw: number;
  importLimitKw: number;
  pvRatedKw: number;
  deadbandKw: number;
  controlGain: number;
  rampPctStep: number;
  minPvPercent: number;
  maxPvPercent: number;
};

const initialState: FormState = {
  controllerEnable: false,
  gridMeterEnable: true,
  inverterEnable: true,
  inverterWriteEnable: false,
  controlMode: 'grid_zero_export',
  exportLimitKw: 0,
  importLimitKw: 0,
  pvRatedKw: 100,
  deadbandKw: 1,
  controlGain: 0.2,
  rampPctStep: 3,
  minPvPercent: 0,
  maxPvPercent: 100,
};

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
}

export default function EngineerActions({ boardIp }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('Idle');

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyToggles = async () => {
    setBusy(true);
    setStatus('Applying toggles...');

    const results = await Promise.all([
      setControllerEnable(boardIp, form.controllerEnable),
      setGridMeterEnable(boardIp, form.gridMeterEnable),
      setInverterEnable(boardIp, form.inverterEnable),
      setInverterWriteEnable(boardIp, form.inverterWriteEnable),
      setControlMode(boardIp, form.controlMode),
    ]);

    const failed = results.filter((r) => !r.ok);
    setStatus(
      failed.length === 0
        ? 'Toggles applied successfully'
        : `Some toggle actions failed (${failed.length})`,
    );
    setBusy(false);
  };

  const handleApplyNumbers = async () => {
    setBusy(true);
    setStatus('Applying numeric settings...');

    const results = await applyControllerSettings(boardIp, {
      exportLimitKw: form.exportLimitKw,
      importLimitKw: form.importLimitKw,
      pvRatedKw: form.pvRatedKw,
      deadbandKw: form.deadbandKw,
      controlGain: form.controlGain,
      rampPctStep: form.rampPctStep,
      minPvPercent: form.minPvPercent,
      maxPvPercent: form.maxPvPercent,
    });

    const failed = results.filter((r) => !r.ok);
    setStatus(
      failed.length === 0
        ? 'Numeric settings applied successfully'
        : `Some numeric settings failed (${failed.length})`,
    );
    setBusy(false);
  };

  return (
    <FormGrid>
      <div className='panel'>
        <h2>Write Actions</h2>
        <p className='help-text'>
          These toggles map directly to board switches. Use them for control
          enable, meter enable, and inverter gate testing. The inverter write
          gate is still pending until site validation. If no inverter is on the
          RS485 bus yet, turn off <strong>Enable Inverter</strong> to reduce
          Modbus timeout noise while you validate the grid meter path.
        </p>
        <div className='form-grid'>
          <ToggleField
            label='Controller Enable'
            help='Master control switch for the local control loop.'
            checked={form.controllerEnable}
            onChange={(v) => setField('controllerEnable', v)}
          />
          <ToggleField
            label='Enable Grid Meter'
            help='Suspend or resume the grid meter polling task.'
            checked={form.gridMeterEnable}
            onChange={(v) => setField('gridMeterEnable', v)}
          />
          <ToggleField
            label='Enable Inverter'
            help='Suspend or resume inverter polling.'
            checked={form.inverterEnable}
            onChange={(v) => setField('inverterEnable', v)}
          />
          <ToggleField
            label='Write Commands To Inverter'
            help='Gate for inverter write operations. Keep pending until site validation.'
            checked={form.inverterWriteEnable}
            onChange={(v) => setField('inverterWriteEnable', v)}
          />
          <SelectField
            label='Control Mode'
            help={controllerModeHelp[form.controlMode]}
            value={form.controlMode}
            onChange={(v) =>
              setField('controlMode', v as FormState['controlMode'])
            }
            options={[
              ['disabled', 'disabled'],
              ['grid_zero_export', 'grid_zero_export'],
              ['grid_limited_export', 'grid_limited_export'],
              ['grid_limited_import', 'grid_limited_import'],
            ]}
          />
        </div>

        <div className='u-mt-md'>
          <button
            type='button'
            className='btn btn--primary'
            onClick={handleApplyToggles}
            disabled={busy}
          >
            {busy ? 'Working...' : 'Apply Toggle Settings'}
          </button>
        </div>
      </div>

      <div className='panel'>
        <h2>Controller Numbers</h2>
        <p className='help-text'>
          These values tune the synch-control loop and should match the board
          defaults or the current commissioning plan. The loop compares grid
          power to the selected mode target, applies deadband and gain, then
          clamps the command between the PV percent limits.
        </p>
        <div className='form-grid'>
          <NumberField
            label='Export Limit kW'
            help={controlFieldHelp.exportLimitKw}
            value={form.exportLimitKw}
            onChange={(v) => setField('exportLimitKw', v)}
            step={0.1}
          />
          <NumberField
            label='Import Limit kW'
            help={controlFieldHelp.importLimitKw}
            value={form.importLimitKw}
            onChange={(v) => setField('importLimitKw', v)}
            step={0.1}
          />
          <NumberField
            label='PV Rated kW'
            help={controlFieldHelp.pvRatedKw}
            value={form.pvRatedKw}
            onChange={(v) => setField('pvRatedKw', v)}
          />
          <NumberField
            label='Deadband kW'
            help={controlFieldHelp.deadbandKw}
            value={form.deadbandKw}
            onChange={(v) => setField('deadbandKw', v)}
            step={0.1}
          />
          <NumberField
            label='Control Gain'
            help={controlFieldHelp.controlGain}
            value={form.controlGain}
            onChange={(v) => setField('controlGain', v)}
            step={0.01}
          />
          <NumberField
            label='Ramp pct Step'
            help={controlFieldHelp.rampPctStep}
            value={form.rampPctStep}
            onChange={(v) => setField('rampPctStep', v)}
            step={0.1}
          />
          <NumberField
            label='Min PV Percent'
            help={controlFieldHelp.minPvPercent}
            value={form.minPvPercent}
            onChange={(v) => setField('minPvPercent', v)}
          />
          <NumberField
            label='Max PV Percent'
            help={controlFieldHelp.maxPvPercent}
            value={form.maxPvPercent}
            onChange={(v) => setField('maxPvPercent', v)}
          />
        </div>

        <div className='u-mt-md'>
          <button
            type='button'
            className='btn btn--primary'
            onClick={handleApplyNumbers}
            disabled={busy}
          >
            {busy ? 'Working...' : 'Apply Numeric Settings'}
          </button>
        </div>

        <div className='info-box u-mt-md'>
          <div className='info-label'>Status</div>
          <div className={cx('info-small', busy && 'text-warn')}>{status}</div>
        </div>
      </div>
    </FormGrid>
  );
}

function NumberField({
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
  return (
    <label className='field'>
      <span className='field-label'>{label}</span>
      {help ? <span className='field-help'>{help}</span> : null}
      <input
        className='field-input'
        type='number'
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function SelectField({
  label,
  help,
  value,
  onChange,
  options,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className='field'>
      <span className='field-label'>{label}</span>
      {help ? <span className='field-help'>{help}</span> : null}
      <select
        className='field-select'
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

function ToggleField({
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
  return (
    <label className='field'>
      <span className='field-label'>{label}</span>
      {help ? <span className='field-help'>{help}</span> : null}
      <button
        type='button'
        onClick={() => onChange(!checked)}
        className={cx('toggle-button', checked ? 'enabled' : 'disabled')}
      >
        {checked ? 'Enabled' : 'Disabled'}
      </button>
    </label>
  );
}
