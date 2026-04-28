import { useEffect, useState } from 'react';
import type { SourceSlot } from '../siteTemplates';
import { applySlotLinkDefaults, DEFAULT_SLOT_LINK } from '../siteTemplates';

function clampInt(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, Math.trunc(v)));
}

export type SlotLinkSettingsDialogProps = {
  open: boolean;
  slot: SourceSlot;
  onClose: () => void;
  /** Persist draft; parent clears revert state if used. */
  onSave: (patch: Partial<SourceSlot>) => void;
};

export function SlotLinkSettingsDialog({ open, slot, onClose, onSave }: SlotLinkSettingsDialogProps) {
  const [draft, setDraft] = useState<SourceSlot>(() => applySlotLinkDefaults(slot));

  useEffect(() => {
    if (!open) return;
    setDraft(applySlotLinkDefaults(slot));
  }, [open, slot.id, slot.transport]);

  if (!open) return null;

  const t = draft.transport || 'rtu';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      serialBaud: draft.serialBaud,
      serialParity: draft.serialParity,
      serialStopBits: draft.serialStopBits,
      serialDataBits: draft.serialDataBits,
      rs485Termination: draft.rs485Termination,
      modbusPollIntervalMs: draft.modbusPollIntervalMs,
      modbusRequestTimeoutMs: draft.modbusRequestTimeoutMs,
      tcpHost: draft.tcpHost,
      tcpPort: draft.tcpPort,
    });
    onClose();
  };

  return (
    <div className='modal-backdrop' role='presentation' onClick={onClose}>
      <div
        className='modal-dialog panel'
        role='dialog'
        aria-modal='true'
        aria-labelledby={`slot-link-${slot.id}`}
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id={`slot-link-${slot.id}`} className='modal-title'>
          Link &amp; timing — {slot.label}
        </h2>
        <p className='help-text'>
          Defaults: <span className='inline-code'>9600 N 8 1</span> on serial,{' '}
          <span className='inline-code'>{DEFAULT_SLOT_LINK.modbusPollIntervalMs} ms</span> poll /{' '}
          <span className='inline-code'>{DEFAULT_SLOT_LINK.modbusRequestTimeoutMs} ms</span> timeout. Exported in{' '}
          <span className='inline-code'>site.config.yaml</span> per slot.
        </p>

        <form className='form-grid' onSubmit={submit}>
          <p className='help-text' style={{ marginTop: 0 }}>
            Transport is <span className='inline-code'>{t}</span> (change on the slot card).
          </p>

          <label className='field'>
            <span className='field-label'>Poll interval (ms)</span>
            <input
              className='field-input'
              inputMode='numeric'
              value={draft.modbusPollIntervalMs ?? DEFAULT_SLOT_LINK.modbusPollIntervalMs}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  modbusPollIntervalMs: clampInt(Number(e.target.value), 250, 60_000),
                }))
              }
            />
          </label>
          <label className='field'>
            <span className='field-label'>Request timeout (ms)</span>
            <input
              className='field-input'
              inputMode='numeric'
              value={draft.modbusRequestTimeoutMs ?? DEFAULT_SLOT_LINK.modbusRequestTimeoutMs}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  modbusRequestTimeoutMs: clampInt(Number(e.target.value), 200, 10_000),
                }))
              }
            />
          </label>

          {t === 'tcp' ? (
            <>
              <label className='field'>
                <span className='field-label'>TCP host</span>
                <input
                  className='field-input'
                  value={draft.tcpHost ?? ''}
                  placeholder='192.168.0.50'
                  onChange={(e) => setDraft((d) => ({ ...d, tcpHost: e.target.value }))}
                />
              </label>
              <label className='field'>
                <span className='field-label'>TCP port</span>
                <input
                  className='field-input'
                  inputMode='numeric'
                  value={draft.tcpPort ?? 502}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, tcpPort: clampInt(Number(e.target.value), 1, 65535) }))
                  }
                />
              </label>
              <p className='help-text'>
                Modbus <strong>unit ID</strong> stays on the slot card (shared with RTU).
              </p>
            </>
          ) : (
            <>
              <label className='field'>
                <span className='field-label'>Baud rate</span>
                <select
                  className='field-select'
                  value={draft.serialBaud ?? DEFAULT_SLOT_LINK.serialBaud}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, serialBaud: Number(e.target.value) }))
                  }
                >
                  {[2400, 4800, 9600, 19200, 38400, 57600, 115200].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label className='field'>
                <span className='field-label'>Parity</span>
                <select
                  className='field-select'
                  value={draft.serialParity ?? 'none'}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      serialParity: e.target.value as SourceSlot['serialParity'],
                    }))
                  }
                >
                  <option value='none'>None (N)</option>
                  <option value='even'>Even (E)</option>
                  <option value='odd'>Odd (O)</option>
                </select>
              </label>
              <label className='field'>
                <span className='field-label'>Stop bits</span>
                <select
                  className='field-select'
                  value={draft.serialStopBits ?? 1}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      serialStopBits: Number(e.target.value) === 2 ? 2 : 1,
                    }))
                  }
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </label>
              <label className='field'>
                <span className='field-label'>Data bits</span>
                <input className='field-input' value={8} readOnly disabled />
              </label>
              {t === 'rtu' ? (
                <label className='field'>
                  <span className='field-label'>RS-485 termination</span>
                  <select
                    className='field-select'
                    value={draft.rs485Termination ?? 'auto'}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        rs485Termination: e.target.value as SourceSlot['rs485Termination'],
                      }))
                    }
                  >
                    <option value='auto'>Auto</option>
                    <option value='on'>On</option>
                    <option value='off'>Off</option>
                  </select>
                </label>
              ) : (
                <p className='help-text'>RS-232: termination field is not used.</p>
              )}
            </>
          )}

          <div className='modal-actions'>
            <button type='button' className='btn btn--secondary' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn--primary'>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
