import React, { useMemo, useState } from 'react';
import {
  type DeviceType,
  type SourceRole,
  type SourceSlot,
  type SiteConfig,
  defaultSite,
} from './siteTemplates';

function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
}

function App() {
  const [tab, setTab] = useState<
    'dashboard' | 'site' | 'slots' | 'templates' | 'engineer' | 'yaml'
  >('dashboard');
  const [config, setConfig] = useState<SiteConfig>(defaultSite);

  const enabledCounts = useMemo(() => {
    const enabled = config.slots.filter((s) => s.enabled);
    return {
      total: enabled.length,
      grids: enabled.filter((s) => s.role === 'grid_meter').length,
      gens: enabled.filter((s) => s.role === 'generator_meter').length,
      inverters: enabled.filter((s) => s.role === 'inverter').length,
    };
  }, [config.slots]);

  const yamlPreview = useMemo(() => generateYamlPreview(config), [config]);

  const updateSiteField = <K extends keyof SiteConfig>(
    key: K,
    value: SiteConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updateSlot = (slotId: string, patch: Partial<SourceSlot>) => {
    setConfig((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) =>
        slot.id === slotId ? { ...slot, ...patch } : slot,
      ),
    }));
  };

  const enabledGrid = config.slots.find(
    (s) => s.enabled && s.role === 'grid_meter',
  );
  const enabledInverters = config.slots.filter(
    (s) => s.enabled && s.role === 'inverter',
  );

  return (
    <div className='min-h-screen bg-slate-100 text-slate-900'>
      <div className='mx-auto max-w-7xl p-4 md:p-6'>
        <header className='mb-6 rounded-3xl bg-white p-5 shadow-sm'>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <div className='text-sm text-slate-500'>
                PV-DG Smart Controller
              </div>
              <h1 className='text-2xl font-semibold'>{config.siteName}</h1>
              <div className='mt-1 text-sm text-slate-500'>
                Board: {config.boardName} · IP: {config.boardIp} · Wi-Fi:{' '}
                {config.wifiSsid || 'NA'}
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
              <StatCard
                label='Enabled Sources'
                value={String(enabledCounts.total)}
              />
              <StatCard
                label='Grid Meters'
                value={String(enabledCounts.grids)}
              />
              <StatCard label='Generators' value={String(enabledCounts.gens)} />
              <StatCard
                label='Inverters'
                value={String(enabledCounts.inverters)}
              />
            </div>
          </div>
        </header>

        <nav className='mb-6 flex flex-wrap gap-2'>
          {[
            ['dashboard', 'Dashboard'],
            ['site', 'Site Setup'],
            ['slots', 'Source Slots'],
            ['templates', 'Templates'],
            ['engineer', 'Engineer Settings'],
            ['yaml', 'YAML Preview'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={classNames(
                'rounded-2xl px-4 py-2 text-sm font-medium transition',
                tab === key
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 shadow-sm hover:bg-slate-50',
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'dashboard' && (
          <section className='grid gap-4 lg:grid-cols-3'>
            <Panel title='System Overview'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <InfoRow
                  label='Controller Mode'
                  value={config.controllerMode}
                />
                <InfoRow label='PV Rated' value={`${config.pvRatedKw} kW`} />
                <InfoRow
                  label='Primary Grid Meter'
                  value={enabledGrid ? enabledGrid.label : 'Not assigned'}
                />
                <InfoRow
                  label='Primary Inverter'
                  value={
                    enabledInverters.length > 0
                      ? enabledInverters[0].label
                      : 'Not assigned'
                  }
                />
                <InfoRow
                  label='Export Limit'
                  value={`${config.exportLimitKw} kW`}
                />
                <InfoRow
                  label='Import Limit'
                  value={`${config.importLimitKw} kW`}
                />
              </div>
            </Panel>

            <Panel title='Board Status'>
              <div className='space-y-2'>
                <InfoRow label='Board Name' value={config.boardName} />
                <InfoRow label='Board IP' value={config.boardIp} />
                <InfoRow label='Wi-Fi SSID' value={config.wifiSsid || 'NA'} />
                <InfoRow label='Commissioning' value='Local / Remote Ready' />
              </div>
            </Panel>

            <Panel title='Action Summary'>
              <div className='space-y-2 text-sm'>
                <div className='rounded-2xl bg-slate-50 p-3'>
                  This PWA will later connect to the board for local monitoring,
                  source assignment, configuration, and YAML generation.
                </div>
                <div className='rounded-2xl bg-slate-50 p-3'>
                  Current goal: stabilize board YAML and shape commissioning
                  flow.
                </div>
              </div>
            </Panel>
          </section>
        )}

        {tab === 'site' && (
          <section className='grid gap-4 lg:grid-cols-2'>
            <Panel title='Site Identity'>
              <FormGrid>
                <TextField
                  label='Site Name'
                  value={config.siteName}
                  onChange={(v) => updateSiteField('siteName', v)}
                />
                <TextField
                  label='Board Name'
                  value={config.boardName}
                  onChange={(v) => updateSiteField('boardName', v)}
                />
                <TextField
                  label='Board IP'
                  value={config.boardIp}
                  onChange={(v) => updateSiteField('boardIp', v)}
                />
                <TextField
                  label='Wi-Fi SSID'
                  value={config.wifiSsid}
                  onChange={(v) => updateSiteField('wifiSsid', v)}
                />
              </FormGrid>
            </Panel>

            <Panel title='Control Defaults'>
              <FormGrid>
                <SelectField
                  label='Controller Mode'
                  value={config.controllerMode}
                  onChange={(v) =>
                    updateSiteField(
                      'controllerMode',
                      v as SiteConfig['controllerMode'],
                    )
                  }
                  options={[
                    ['disabled', 'disabled'],
                    ['grid_zero_export', 'grid_zero_export'],
                    ['grid_limited_export', 'grid_limited_export'],
                    ['grid_limited_import', 'grid_limited_import'],
                  ]}
                />
                <NumberField
                  label='PV Rated kW'
                  value={config.pvRatedKw}
                  onChange={(v) => updateSiteField('pvRatedKw', v)}
                />
                <NumberField
                  label='Deadband kW'
                  value={config.deadbandKw}
                  onChange={(v) => updateSiteField('deadbandKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Control Gain'
                  value={config.controlGain}
                  onChange={(v) => updateSiteField('controlGain', v)}
                  step={0.01}
                />
                <NumberField
                  label='Export Limit kW'
                  value={config.exportLimitKw}
                  onChange={(v) => updateSiteField('exportLimitKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Import Limit kW'
                  value={config.importLimitKw}
                  onChange={(v) => updateSiteField('importLimitKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Ramp pct Step'
                  value={config.rampPctStep}
                  onChange={(v) => updateSiteField('rampPctStep', v)}
                  step={0.1}
                />
                <NumberField
                  label='Min PV Percent'
                  value={config.minPvPercent}
                  onChange={(v) => updateSiteField('minPvPercent', v)}
                />
                <NumberField
                  label='Max PV Percent'
                  value={config.maxPvPercent}
                  onChange={(v) => updateSiteField('maxPvPercent', v)}
                />
              </FormGrid>
            </Panel>
          </section>
        )}

        {tab === 'slots' && (
          <section className='space-y-4'>
            {config.slots.map((slot) => (
              <Panel key={slot.id} title={slot.label}>
                <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
                  <ToggleField
                    label='Enabled'
                    checked={slot.enabled}
                    onChange={(v) => updateSlot(slot.id, { enabled: v })}
                  />
                  <SelectField
                    label='Device Type'
                    value={slot.deviceType}
                    onChange={(v) =>
                      updateSlot(slot.id, { deviceType: v as DeviceType })
                    }
                    options={[
                      ['none', 'none'],
                      ['em500', 'em500'],
                      ['huawei', 'huawei'],
                    ]}
                  />
                  <SelectField
                    label='Role'
                    value={slot.role}
                    onChange={(v) =>
                      updateSlot(slot.id, { role: v as SourceRole })
                    }
                    options={[
                      ['none', 'none'],
                      ['grid_meter', 'grid_meter'],
                      ['generator_meter', 'generator_meter'],
                      ['inverter', 'inverter'],
                    ]}
                  />
                  <NumberField
                    label='Modbus ID'
                    value={slot.modbusId}
                    onChange={(v) => updateSlot(slot.id, { modbusId: v })}
                  />
                  <NumberField
                    label='Capacity kW'
                    value={slot.capacityKw}
                    onChange={(v) => updateSlot(slot.id, { capacityKw: v })}
                    step={0.1}
                  />
                </div>

                <div className='mt-4 grid gap-4 md:grid-cols-2'>
                  <TextField
                    label='IP Hint / Notes'
                    value={slot.ipHint || ''}
                    onChange={(v) => updateSlot(slot.id, { ipHint: v })}
                  />
                  <TextField
                    label='Commissioning Notes'
                    value={slot.notes || ''}
                    onChange={(v) => updateSlot(slot.id, { notes: v })}
                  />
                </div>

                <div className='mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600'>
                  Template hint: {templateHelp[slot.deviceType]}
                </div>
              </Panel>
            ))}
          </section>
        )}

        {tab === 'templates' && (
          <section className='grid gap-4 lg:grid-cols-2'>
            <Panel title='Rozwell / EM500 Template'>
              <ul className='space-y-2 text-sm text-slate-700'>
                <li>Live voltage/current/power/frequency/power factor</li>
                <li>Import energy uses confirmed corrected decode</li>
                <li>Use for grid meters and generator meters</li>
                <li>Role selected per slot</li>
              </ul>
            </Panel>

            <Panel title='Huawei Template'>
              <ul className='space-y-2 text-sm text-slate-700'>
                <li>Pmax</li>
                <li>Actual power</li>
                <li>Command write path</li>
                <li>Deeper live testing deferred until site visit</li>
              </ul>
            </Panel>
          </section>
        )}

        {tab === 'engineer' && (
          <section className='grid gap-4 lg:grid-cols-2'>
            <Panel title='Engineer Workflow'>
              <ol className='space-y-2 text-sm text-slate-700'>
                <li>1. Detect board on LAN or enter board IP</li>
                <li>2. Select site template</li>
                <li>3. Assign slots and Modbus IDs</li>
                <li>4. Review generated YAML</li>
                <li>5. Build / flash / OTA later</li>
              </ol>
            </Panel>

            <Panel title='Future Hooks'>
              <ul className='space-y-2 text-sm text-slate-700'>
                <li>Board discovery</li>
                <li>Live REST / WebSocket telemetry</li>
                <li>Role-based access</li>
                <li>YAML export</li>
                <li>Firmware build pipeline</li>
              </ul>
            </Panel>
          </section>
        )}

        {tab === 'yaml' && (
          <section className='space-y-4'>
            <Panel title='Generated Site YAML Preview'>
              <textarea
                value={yamlPreview}
                readOnly
                className='min-h-[520px] w-full rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none'
              />
            </Panel>
          </section>
        )}
      </div>
    </div>
  );
}

const templateHelp: Record<DeviceType, string> = {
  none: 'Unused slot',
  em500: 'Rozwell / EM500 meter template',
  huawei: 'Huawei inverter template',
};

function generateYamlPreview(config: SiteConfig): string {
  const slotLines = config.slots
    .map(
      (slot) => `  - id: ${slot.id}
    label: "${slot.label}"
    enabled: ${slot.enabled}
    device_type: ${slot.deviceType}
    role: ${slot.role}
    modbus_id: ${slot.modbusId}
    capacity_kw: ${slot.capacityKw}`,
    )
    .join('\n');

  return `site:
  name: "${config.siteName}"
  board_name: "${config.boardName}"
  board_ip: "${config.boardIp}"
  wifi_ssid: "${config.wifiSsid}"

controller:
  mode: ${config.controllerMode}
  pv_rated_kw: ${config.pvRatedKw}
  deadband_kw: ${config.deadbandKw}
  gain: ${config.controlGain}
  export_limit_kw: ${config.exportLimitKw}
  import_limit_kw: ${config.importLimitKw}
  ramp_pct_step: ${config.rampPctStep}
  min_pv_percent: ${config.minPvPercent}
  max_pv_percent: ${config.maxPvPercent}

slots:
${slotLines}
`;
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className='rounded-3xl bg-white p-5 shadow-sm'>
      <h2 className='mb-4 text-lg font-semibold'>{title}</h2>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl bg-slate-50 p-3'>
      <div className='text-xs text-slate-500'>{label}</div>
      <div className='mt-1 text-xl font-semibold'>{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl bg-slate-50 p-3'>
      <div className='text-xs text-slate-500'>{label}</div>
      <div className='mt-1 text-sm font-medium'>{value}</div>
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className='grid gap-4 md:grid-cols-2'>{children}</div>;
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className='block'>
      <div className='mb-1 text-sm font-medium'>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className='w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-600'
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className='block'>
      <div className='mb-1 text-sm font-medium'>{label}</div>
      <input
        type='number'
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className='w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-600'
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className='block'>
      <div className='mb-1 text-sm font-medium'>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className='w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-600'
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
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className='block'>
      <div className='mb-1 text-sm font-medium'>{label}</div>
      <button
        type='button'
        onClick={() => onChange(!checked)}
        className={classNames(
          'w-full rounded-2xl px-3 py-2 text-left font-medium',
          checked ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700',
        )}
      >
        {checked ? 'Enabled' : 'Disabled'}
      </button>
    </label>
  );
}

export default App;
