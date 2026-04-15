import { useMemo, useState } from 'react';
import './App.css';
import DashboardOverview from './components/DashboardOverview';
import EngineerActions from './components/EngineerActions';
import { generateSiteExport } from './siteExport';
import {
  type DeviceType,
  type SourceRole,
  type SourceSlot,
  type SiteConfig,
  defaultSite,
} from './siteTemplates';

function cx(...xs: Array<string | false | undefined>) {
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

  const yamlPreview = useMemo(() => generateSiteExport(config), [config]);

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

  return (
    <div className='app-shell'>
      <div className='app-container'>
        <header className='app-header'>
          <div className='app-header-top'>
            <div>
              <div className='app-kicker'>PV-DG Smart Controller</div>
              <h1 className='app-title'>{config.siteName}</h1>
              <div className='app-subtitle'>
                Board: {config.boardName} · IP: {config.boardIp} · Wi-Fi:{' '}
                {config.wifiSsid || 'NA'}
              </div>
            </div>

            <div className='header-stats'>
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

        <nav className='tab-bar'>
          {[
            ['dashboard', 'Dashboard'],
            ['site', 'Site Setup'],
            ['slots', 'Source Slots'],
            ['templates', 'Templates'],
            ['engineer', 'Engineer Actions'],
            ['yaml', 'YAML Preview'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={cx('tab-button', tab === key && 'active')}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'dashboard' && <DashboardOverview boardIp={config.boardIp} />}

        {tab === 'site' && (
          <section className='section-grid'>
            <div className='panel'>
              <h2>Site Identity</h2>
              <div className='form-grid'>
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
              </div>
            </div>

            <div className='panel'>
              <h2>Control Defaults</h2>
              <div className='form-grid'>
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
              </div>
            </div>
          </section>
        )}

        {tab === 'slots' && (
          <section className='slot-list'>
            {config.slots.map((slot) => (
              <div key={slot.id} className='slot-card'>
                <h2>{slot.label}</h2>

                <div className='form-grid'>
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

                <div className='slot-help'>
                  Template hint: {templateHelp[slot.deviceType]}
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'templates' && (
          <section className='section-grid'>
            <div className='panel'>
              <h2>Rozwell / EM500 Template</h2>
              <ul className='list-block'>
                <li>Live voltage/current/power/frequency/power factor</li>
                <li>Import energy uses confirmed corrected decode</li>
                <li>Use for grid meters and generator meters</li>
                <li>Role selected per slot</li>
              </ul>
            </div>

            <div className='panel'>
              <h2>Huawei Template</h2>
              <ul className='list-block'>
                <li>Pmax</li>
                <li>Actual power</li>
                <li>Command write path</li>
                <li>Deeper live testing deferred until site visit</li>
              </ul>
            </div>
          </section>
        )}

        {tab === 'engineer' && <EngineerActions boardIp={config.boardIp} />}

        {tab === 'yaml' && (
          <section className='panel'>
            <div className='panel-header'>
              <h2>Generated Site Export</h2>
              <div className='panel-actions'>
                <button
                  className='tab-button active'
                  onClick={() =>
                    navigator.clipboard.writeText(yamlPreview).catch(() => {})
                  }
                >
                  Copy Export
                </button>
                <button
                  className='tab-button active'
                  onClick={() => downloadExport(yamlPreview, config.siteName)}
                >
                  Download File
                </button>
              </div>
            </div>
            <textarea value={yamlPreview} readOnly className='yaml-box' />
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='stat-card'>
      <div className='stat-label'>{label}</div>
      <div className='stat-value'>{value}</div>
    </div>
  );
}

function downloadExport(content: string, siteName: string) {
  const blob = new Blob([content], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${siteName.replace(/\s+/g, '_').toLowerCase()}_site_export.yaml`;
  link.click();
  URL.revokeObjectURL(url);
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
    <label className='field'>
      <span className='field-label'>{label}</span>
      <input
        className='field-input'
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
    <label className='field'>
      <span className='field-label'>{label}</span>
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
    <label className='field'>
      <span className='field-label'>{label}</span>
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
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className='field'>
      <span className='field-label'>{label}</span>
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

export default App;
