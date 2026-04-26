import { useEffect, useMemo, useState } from 'react';

type ControlState = {
  modbusPollIntervalMs: number;
  modbusRequestTimeoutMs: number;
  rs485Baud: number;
  rs485Parity: 'none' | 'even' | 'odd';
  rs485StopBits: 1 | 2;
  rs485Termination: 'auto' | 'on' | 'off';
  rs232Baud: number;
  rs232Parity: 'none' | 'even' | 'odd';
  rs232StopBits: 1 | 2;
  tcpEnabled: boolean;
  tcpHost: string;
  tcpPort: number;
  tcpUnitId: number;
};

const DEFAULTS: ControlState = {
  modbusPollIntervalMs: 1000,
  modbusRequestTimeoutMs: 1200,
  rs485Baud: 9600,
  rs485Parity: 'even',
  rs485StopBits: 1,
  rs485Termination: 'auto',
  rs232Baud: 9600,
  rs232Parity: 'none',
  rs232StopBits: 1,
  tcpEnabled: false,
  tcpHost: '',
  tcpPort: 502,
  tcpUnitId: 1,
};

function clampInt(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, Math.trunc(v)));
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6, padding: '8px 0' }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
      {help ? <span className='help-text' style={{ margin: 0 }}>{help}</span> : null}
      {children}
    </label>
  );
}

export function ManufacturerControlPage({ boardIp }: { boardIp: string }) {
  const storageKey = useMemo(() => `mfgControl:${boardIp || 'no-board'}`, [boardIp]);
  const [state, setState] = useState<ControlState>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ControlState>;
      setState({ ...DEFAULTS, ...parsed });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, storageKey]);

  const applyDisabled = true;

  return (
    <section className='card card-wide'>
      <div className='card-header'>
        <div>
          <h2>Control</h2>
          <p className='help-text'>Fine-tune communication and polling (manufacturer-only)</p>
        </div>
        <div className='card-header-meta'>
          <button
            className={['toggle-button', applyDisabled ? 'disabled' : 'enabled'].join(' ')}
            disabled={applyDisabled}
            title='Wiring to firmware/gateway will be added next'
            onClick={() => undefined}
          >
            Apply to controller
          </button>
        </div>
      </div>

      <div className='inline-banner inline-banner--warn' style={{ marginBottom: 12 }}>
        These settings are saved locally for now. Wiring to firmware / gateway will be added next.
      </div>

      <div className='source-metrics'>
        <details className='source-metric-group' open>
          <summary className='source-metric-group-title'>Modbus polling</summary>
          <div className='source-metric-group-body'>
            <Field label='Poll interval' help='How often we read meters/devices. Lower = faster updates, higher = less bus load.'>
              <input
                className='field-input'
                inputMode='numeric'
                value={state.modbusPollIntervalMs}
                onChange={(e) => {
                  const v = clampInt(Number(e.target.value), 250, 60_000);
                  setDirty(true);
                  setState((s) => ({ ...s, modbusPollIntervalMs: v }));
                }}
              />
            </Field>
            <Field label='Request timeout' help='If a device is slow/noisy, increase this slightly.'>
              <input
                className='field-input'
                inputMode='numeric'
                value={state.modbusRequestTimeoutMs}
                onChange={(e) => {
                  const v = clampInt(Number(e.target.value), 200, 10_000);
                  setDirty(true);
                  setState((s) => ({ ...s, modbusRequestTimeoutMs: v }));
                }}
              />
            </Field>
            <p className='help-text' style={{ marginTop: 8 }}>
              Suggested starting point: <span className='inline-code'>1000 ms</span> poll and{' '}
              <span className='inline-code'>1200 ms</span> timeout for short buses; increase timeout for long cables/RS485 hubs.
            </p>
          </div>
        </details>

        <details className='source-metric-group' open>
          <summary className='source-metric-group-title'>RS485 (Modbus RTU)</summary>
          <div className='source-metric-group-body'>
            <Field label='Baud rate'>
              <select
                className='field-select'
                value={state.rs485Baud}
                onChange={(e) => {
                  setDirty(true);
                  setState((s) => ({ ...s, rs485Baud: Number(e.target.value) }));
                }}
              >
                {[2400, 4800, 9600, 19200, 38400, 57600, 115200].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
            <Field label='Parity'>
              <select
                className='field-select'
                value={state.rs485Parity}
                onChange={(e) => {
                  setDirty(true);
                  setState((s) => ({ ...s, rs485Parity: e.target.value as ControlState['rs485Parity'] }));
                }}
              >
                <option value='none'>None</option>
                <option value='even'>Even</option>
                <option value='odd'>Odd</option>
              </select>
            </Field>
            <Field label='Stop bits'>
              <select
                className='field-select'
                value={state.rs485StopBits}
                onChange={(e) => {
                  setDirty(true);
                  setState((s) => ({ ...s, rs485StopBits: Number(e.target.value) as 1 | 2 }));
                }}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </Field>
            <Field label='Termination' help='On long cable runs, termination can improve signal integrity.'>
              <select
                className='field-select'
                value={state.rs485Termination}
                onChange={(e) => {
                  setDirty(true);
                  setState((s) => ({ ...s, rs485Termination: e.target.value as ControlState['rs485Termination'] }));
                }}
              >
                <option value='auto'>Auto</option>
                <option value='on'>On</option>
                <option value='off'>Off</option>
              </select>
            </Field>
          </div>
        </details>

        <details className='source-metric-group'>
          <summary className='source-metric-group-title'>RS232</summary>
          <div className='source-metric-group-body'>
            <Field label='Baud rate'>
              <select
                className='field-select'
                value={state.rs232Baud}
                onChange={(e) => {
                  setDirty(true);
                  setState((s) => ({ ...s, rs232Baud: Number(e.target.value) }));
                }}
              >
                {[2400, 4800, 9600, 19200, 38400, 57600, 115200].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
            <Field label='Parity'>
              <select
                className='field-select'
                value={state.rs232Parity}
                onChange={(e) => {
                  setDirty(true);
                  setState((s) => ({ ...s, rs232Parity: e.target.value as ControlState['rs232Parity'] }));
                }}
              >
                <option value='none'>None</option>
                <option value='even'>Even</option>
                <option value='odd'>Odd</option>
              </select>
            </Field>
            <Field label='Stop bits'>
              <select
                className='field-select'
                value={state.rs232StopBits}
                onChange={(e) => {
                  setDirty(true);
                  setState((s) => ({ ...s, rs232StopBits: Number(e.target.value) as 1 | 2 }));
                }}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </Field>
          </div>
        </details>

        <details className='source-metric-group'>
          <summary className='source-metric-group-title'>Modbus TCP/IP</summary>
          <div className='source-metric-group-body'>
            <Field label='Enable Modbus TCP'>
              <select
                className='field-select'
                value={state.tcpEnabled ? 'on' : 'off'}
                onChange={(e) => {
                  setDirty(true);
                  setState((s) => ({ ...s, tcpEnabled: e.target.value === 'on' }));
                }}
              >
                <option value='off'>Off</option>
                <option value='on'>On</option>
              </select>
            </Field>
            <Field label='TCP host' help='IP or hostname of Modbus TCP gateway/meter.'>
              <input
                className='field-input'
                value={state.tcpHost}
                placeholder='e.g. 192.168.0.50'
                onChange={(e) => {
                  setDirty(true);
                  setState((s) => ({ ...s, tcpHost: e.target.value }));
                }}
              />
            </Field>
            <Field label='TCP port'>
              <input
                className='field-input'
                inputMode='numeric'
                value={state.tcpPort}
                onChange={(e) => {
                  const v = clampInt(Number(e.target.value), 1, 65535);
                  setDirty(true);
                  setState((s) => ({ ...s, tcpPort: v }));
                }}
              />
            </Field>
            <Field label='Unit ID' help='Usually 1 for Modbus TCP, but can vary by gateway.'>
              <input
                className='field-input'
                inputMode='numeric'
                value={state.tcpUnitId}
                onChange={(e) => {
                  const v = clampInt(Number(e.target.value), 1, 247);
                  setDirty(true);
                  setState((s) => ({ ...s, tcpUnitId: v }));
                }}
              />
            </Field>
          </div>
        </details>
      </div>

      {dirty ? (
        <p className='help-text' style={{ marginTop: 12 }}>
          Saved locally for this controller. Apply wiring will be added next.
        </p>
      ) : null}
    </section>
  );
}

