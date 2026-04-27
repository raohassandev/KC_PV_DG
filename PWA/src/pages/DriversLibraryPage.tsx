import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { deleteDriver, fetchDriver, fetchDrivers, saveDriver } from '../gatewayDriversApi';
import { cacheDriver, cacheDriverMetaList } from '../driverCache';
import type { DriverDefinition, DriverMeta, DriverRegister } from '../types/driverLibrary';

const EMPTY_DRIVER: DriverDefinition = {
  id: '',
  name: '',
  vendor: '',
  deviceType: 'meter',
  notes: '',
  recommendedPollMs: 1000,
  registers: [],
};

function clampInt(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, Math.trunc(v)));
}

function safeId(raw: string): string {
  return raw.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 96);
}

function autoKeyFromLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function RegisterRow({
  r,
  onChange,
  onDelete,
}: {
  r: DriverRegister;
  onChange: (next: DriverRegister) => void;
  onDelete: () => void;
}) {
  const computedKey = autoKeyFromLabel(r.label || '');
  const valueKindOptions: Array<[DriverRegister['valueKind'], string]> = [
    ['U_WORD', 'U_WORD (uint16 · 1 reg)'],
    ['S_WORD', 'S_WORD (int16 · 1 reg)'],
    ['U_DWORD', 'U_DWORD (uint32 · 2 regs)'],
    ['S_DWORD', 'S_DWORD (int32 · 2 regs)'],
    ['U_QWORD', 'U_QWORD (uint64 · 4 regs)'],
    ['S_QWORD', 'S_QWORD (int64 · 4 regs)'],
    ['FP32', 'FP32 (float32 · 2 regs)'],
    ['STRING', 'STRING (text · N regs)'],
  ];
  const isEnabled = r.enabled !== false;
  return (
    <div className='slot-card' style={{ padding: 14 }}>
      <div className='driver-reg-row'>
        <label className='driver-reg-enabled' title='Enable this register'>
          <input
            type='checkbox'
            checked={isEnabled}
            onChange={(e) => onChange({ ...r, enabled: e.target.checked })}
            aria-label='Enable register'
          />
        </label>
        <div className='driver-reg-main'>
          <div className='driver-reg-label'>
            <span className='driver-reg-label__key'>{r.paramKey || computedKey || 'param'}</span>
            <input
              className='field-input driver-reg-label__input'
              value={r.label}
              placeholder='Parameter label'
              onChange={(e) => {
                const nextLabel = e.target.value;
                const nextKey = autoKeyFromLabel(nextLabel);
                // If user hasn't customized the key, keep it auto-synced to label.
                const currentAuto = autoKeyFromLabel(r.label || '');
                const shouldAutoUpdate = !r.paramKey || r.paramKey === currentAuto;
                onChange({ ...r, label: nextLabel, paramKey: shouldAutoUpdate ? nextKey : r.paramKey });
              }}
            />
          </div>
          <input
            className='field-input driver-reg-unit'
            value={r.unit ?? ''}
            placeholder='Unit'
            onChange={(e) => onChange({ ...r, unit: e.target.value })}
          />
        </div>

        <select
          className='field-select driver-reg-type'
          value={r.registerType}
          onChange={(e) => onChange({ ...r, registerType: e.target.value as DriverRegister['registerType'] })}
          aria-label='Register type'
        >
          <option value='read'>Read</option>
          <option value='holding'>Holding</option>
          <option value='coil'>Coil</option>
          <option value='discrete_input'>Discrete</option>
        </select>

        <input
          className='field-input driver-reg-addr'
          inputMode='numeric'
          value={r.address}
          onChange={(e) => onChange({ ...r, address: clampInt(Number(e.target.value), 0, 200_000) })}
          aria-label='Address'
        />

        <select
          className='field-select driver-reg-kind'
          value={r.valueKind}
          onChange={(e) => {
            const nextKind = e.target.value as DriverRegister['valueKind'];
            onChange({
              ...r,
              valueKind: nextKind,
              stringLengthWords: nextKind === 'STRING' ? Math.max(1, Math.trunc(r.stringLengthWords ?? 10)) : undefined,
            });
          }}
          aria-label='Value type'
        >
          {valueKindOptions.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        {r.valueKind === 'STRING' ? (
          <input
            className='field-input driver-reg-scale'
            inputMode='numeric'
            value={r.stringLengthWords ?? 10}
            onChange={(e) => onChange({ ...r, stringLengthWords: clampInt(Number(e.target.value), 1, 64) })}
            aria-label='String length (words)'
            placeholder='words'
          />
        ) : (
          <input
            className='field-input driver-reg-scale'
            inputMode='decimal'
            value={r.scale ?? ''}
            onChange={(e) => onChange({ ...r, scale: e.target.value === '' ? undefined : Number(e.target.value) })}
            aria-label='Scale'
            placeholder='scale'
          />
        )}

        <select
          className='field-select driver-reg-word'
          value={r.wordOrder ?? 'normal'}
          onChange={(e) => onChange({ ...r, wordOrder: e.target.value as DriverRegister['wordOrder'] })}
          aria-label='Word order'
        >
          <option value='normal'>Word: normal</option>
          <option value='lowWordFirst'>Word: low-first</option>
        </select>

        <select
          className='field-select driver-reg-byte'
          value={r.byteOrder ?? 'ABCD'}
          onChange={(e) => onChange({ ...r, byteOrder: e.target.value as DriverRegister['byteOrder'] })}
          aria-label='Byte order'
        >
          <option value='ABCD'>Byte: ABCD</option>
          <option value='BADC'>Byte: BADC</option>
          <option value='CDAB'>Byte: CDAB</option>
          <option value='DCBA'>Byte: DCBA</option>
        </select>

        <input
          className='field-input driver-reg-prec'
          inputMode='numeric'
          value={r.precision ?? ''}
          onChange={(e) => onChange({ ...r, precision: e.target.value === '' ? undefined : clampInt(Number(e.target.value), 0, 6) })}
          aria-label='Precision'
          placeholder='dec'
        />

        <button className='btn btn--secondary driver-reg-remove' onClick={onDelete} type='button'>
          Remove
        </button>
      </div>
    </div>
  );
}

export function DriversLibraryPage() {
  const { role, fetchGateway, siteGatewaySyncAvailable } = useAuth();
  const canWrite = role === 'manufacturer';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<DriverMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<DriverDefinition>(EMPTY_DRIVER);
  const [newId, setNewId] = useState('');

  const gatewayReady = siteGatewaySyncAvailable;

  const selectedMeta = useMemo(() => drivers.find((d) => d.id === selectedId) ?? null, [drivers, selectedId]);

  const reload = useCallback(async () => {
    if (!gatewayReady) return;
    setBusy(true);
    setError(null);
    try {
      const list = await fetchDrivers(fetchGateway);
      setDrivers(list.sort((a, b) => a.name.localeCompare(b.name)));
      cacheDriverMetaList(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load drivers');
    } finally {
      setBusy(false);
    }
  }, [fetchGateway, gatewayReady]);

  useEffect(() => {
    if (!gatewayReady) return;
    void reload();
  }, [gatewayReady, reload]);

  const loadSelected = useCallback(async () => {
    if (!gatewayReady) return;
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const d = await fetchDriver(fetchGateway, selectedId);
      cacheDriver(d);
      setDraft(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load driver');
    } finally {
      setBusy(false);
    }
  }, [fetchGateway, gatewayReady, selectedId]);

  useEffect(() => {
    if (!gatewayReady) return;
    void loadSelected();
  }, [gatewayReady, loadSelected]);

  return (
    <section className='card card-wide'>
      <div className='card-header'>
        <div>
          <h2>Drivers</h2>
          <p className='help-text'>Manufacturer driver library (meters & inverters)</p>
        </div>
        <div className='card-header-meta'>
          <span className={['updated-pill', busy ? 'updated-pill--busy' : ''].filter(Boolean).join(' ')}>
            {busy ? 'Working…' : 'Ready'}
          </span>
        </div>
      </div>

      {!gatewayReady ? (
        <>
          <div className='inline-banner inline-banner--warn'>
            Gateway is not configured (or you are not logged in via gateway). Drivers require a gateway session.
          </div>
          <p className='help-text' style={{ marginTop: 10 }}>
            Fix: run the gateway locally and set <span className='inline-code'>VITE_GATEWAY_URL</span>, then login as
            manufacturer again.
          </p>
        </>
      ) : null}

      {error ? <div className='inline-banner inline-banner--warn'>{error}</div> : null}

      <div style={{ display: 'grid', gap: 14 }}>
        <div className='slot-card' style={{ padding: 14 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Driver</span>
                <select
                  className='field-select'
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value=''>Select a driver…</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.deviceType})
                    </option>
                  ))}
                </select>
              </label>
              <button className='toggle-button disabled' type='button' onClick={() => void reload()}>
                Reload
              </button>
            </div>

            {canWrite ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>New driver id</span>
                  <input
                    className='field-input'
                    value={newId}
                    placeholder='e.g. em500_v2'
                    onChange={(e) => setNewId(safeId(e.target.value))}
                  />
                  <span className='help-text' style={{ margin: 0 }}>
                    Use letters/numbers/_/-. This becomes the storage file name.
                  </span>
                </label>
                <button
                  className={['toggle-button', newId ? 'enabled' : 'disabled'].join(' ')}
                  type='button'
                  disabled={!newId}
                  onClick={() => {
                    setSelectedId(newId);
                    setDraft({ ...EMPTY_DRIVER, id: newId, name: newId });
                  }}
                >
                  Create draft
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {selectedId ? (
          <div className='slot-card' style={{ padding: 14 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Name</span>
                  <input
                    className='field-input'
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Vendor</span>
                  <input
                    className='field-input'
                    value={draft.vendor ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, vendor: e.target.value }))}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Device type</span>
                  <select
                    className='field-select'
                    value={draft.deviceType}
                    onChange={(e) => setDraft((d) => ({ ...d, deviceType: e.target.value as DriverDefinition['deviceType'] }))}
                  >
                    <option value='meter'>Meter</option>
                    <option value='inverter'>Inverter</option>
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Recommended poll (ms)</span>
                  <input
                    className='field-input'
                    inputMode='numeric'
                    value={draft.recommendedPollMs ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, recommendedPollMs: clampInt(Number(e.target.value), 250, 60_000) }))}
                  />
                </label>
              </div>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Notes</span>
                <textarea
                  className='field-textarea'
                  value={draft.notes ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                />
              </label>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className={['toggle-button', canWrite ? 'enabled' : 'disabled'].join(' ')}
                  type='button'
                  disabled={!canWrite}
                  onClick={() => {
                    setDraft((d) => ({
                      ...d,
                      registers: [
                        ...d.registers,
                        {
                          paramKey: `param_${d.registers.length + 1}`,
                          label: 'New parameter',
                          registerType: 'read',
                          address: 0,
                          valueKind: 'U_WORD',
                          wordOrder: 'normal',
                          byteOrder: 'ABCD',
                          scale: 1,
                          precision: 0,
                        },
                      ],
                    }));
                  }}
                >
                  Add register
                </button>

                <button
                  className={['toggle-button', canWrite ? 'enabled' : 'disabled'].join(' ')}
                  type='button'
                  disabled={!canWrite}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      const saved = await saveDriver(fetchGateway, selectedId, { ...draft, id: selectedId });
                      cacheDriver(saved);
                      setDraft(saved);
                      await reload();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Save failed');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Save
                </button>

                <button
                  className={['toggle-button', canWrite ? 'disabled' : 'disabled'].join(' ')}
                  type='button'
                  disabled={!canWrite}
                  onClick={async () => {
                    if (!selectedId) return;
                    setBusy(true);
                    setError(null);
                    try {
                      await deleteDriver(fetchGateway, selectedId);
                      setSelectedId('');
                      setDraft(EMPTY_DRIVER);
                      await reload();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Delete failed');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Delete
                </button>
              </div>

              <p className='help-text' style={{ margin: 0 }}>
                Selected: <span className='inline-code'>{selectedId}</span>
                {selectedMeta?.updatedAt ? (
                  <>
                    {' '}
                    • updated <span className='inline-code'>{selectedMeta.updatedAt}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        ) : null}

        {selectedId ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div className='slot-card' style={{ padding: 14 }}>
              <div className='driver-reg-header'>
                <div>On</div>
                <div>Key / Label</div>
                <div>Type</div>
                <div>Addr</div>
                <div>Data</div>
                <div>Scale</div>
                <div>Word</div>
                <div>Byte</div>
                <div>Dec</div>
                <div />
              </div>
              <p className='help-text' style={{ margin: '10px 2px 0' }}>
                Tip: energy counters are usually <span className='inline-code'>U_QWORD (uint64 · 4 regs)</span> with a scale (e.g.{' '}
                <span className='inline-code'>0.01</span>).
              </p>
            </div>
            {draft.registers.map((r, idx) => (
              <RegisterRow
                key={`${r.paramKey}-${idx}`}
                r={r}
                onChange={(next) =>
                  setDraft((d) => ({
                    ...d,
                    registers: d.registers.map((rr, ii) => (ii === idx ? next : rr)),
                  }))
                }
                onDelete={() =>
                  setDraft((d) => ({
                    ...d,
                    registers: d.registers.filter((_rr, ii) => ii !== idx),
                  }))
                }
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

