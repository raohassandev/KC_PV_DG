import { useEffect, useMemo, useState } from 'react';
import './App.css';
import DashboardOverview from './components/DashboardOverview';
import EngineerActions from './components/EngineerActions';
import { ProductArea } from './features/dynamic-zero-export/ProductArea';
import { generateSiteBundle } from './siteBundleGenerator';
import {
  deriveZones as deriveCommissioningZones,
  loadProfile as loadCommissioningProfile,
  policyWarnings as commissioningWarnings,
  saveProfile as saveCommissioningProfile,
} from './policySchema';
import {
  type DeviceType,
  type SourceRole,
  type SourceSlot,
  type SiteConfig,
  controllerModeHelp,
  controlFieldHelp,
  deviceOptionsForRole,
  deviceHelp,
  roleHelp,
  defaultSite,
} from './siteTemplates';

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
}

function App() {
  const [tab, setTab] = useState<
    | 'product'
    | 'dashboard'
    | 'site'
    | 'topology'
    | 'slots'
    | 'templates'
    | 'review'
    | 'engineer'
    | 'yaml'
  >('product');
  const [config, setConfig] = useState<SiteConfig>(defaultSite);
  const [profileName, setProfileName] = useState('default');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [notice, setNotice] = useState<string | null>('Profile loaded');

  const enabledCounts = useMemo(() => {
    const enabled = config.slots.filter((s) => s.enabled);
    return {
      total: enabled.length,
      grids: enabled.filter((s) => s.role === 'grid_meter').length,
      gens: enabled.filter((s) => s.role === 'generator_meter').length,
      inverters: enabled.filter((s) => s.role === 'inverter').length,
    };
  }, [config.slots]);

  const siteBundle = useMemo(() => generateSiteBundle(config), [config]);
  const yamlPreview = siteBundle[0]?.content ?? '';
  const zones = useMemo(() => deriveCommissioningZones(config), [config]);
  const gridSources = useMemo(
    () => config.slots.filter((slot) => slot.enabled && slot.role === 'grid_meter'),
    [config.slots],
  );
  const generatorSources = useMemo(
    () =>
      config.slots.filter(
        (slot) => slot.enabled && slot.role === 'generator_meter',
      ),
    [config.slots],
  );
  const inverterGroups = useMemo(
    () => config.slots.filter((slot) => slot.enabled && slot.role === 'inverter'),
    [config.slots],
  );

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

  useEffect(() => {
    try {
      localStorage.setItem('pvdg.currentSite', JSON.stringify(config));
    } catch {
      // Ignore persistence failures in browser privacy modes.
    }
  }, [config]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pvdg.currentSite');
      if (!raw) return;
      const parsed = JSON.parse(raw) as SiteConfig;
      setConfig((prev) => ({ ...prev, ...parsed }));
    } catch {
      // Keep defaults if persisted state is invalid.
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
            ['product', 'Dynamic Zero Export'],
            ['dashboard', 'Dashboard'],
            ['site', 'Site Setup'],
            ['topology', 'Topology'],
            ['slots', 'Source Slots'],
            ['templates', 'Templates'],
            ['review', 'Validation'],
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

        {notice ? (
          <div className='notice-bar' role='status' aria-live='polite'>
            <span>{notice}</span>
            <button className='notice-close' onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        {tab === 'product' && <ProductArea />}
        {tab === 'dashboard' && <DashboardOverview boardIp={config.boardIp} />}

        {tab === 'site' && (
          <section className='section-grid'>
            <div className='panel'>
              <h2>Site Identity</h2>
              <p className='help-text'>
                These fields define the site identity used by the PWA and
                generated export bundle.
              </p>
              <div className='form-grid'>
                <TextField
                  label='Site Name'
                  help='Human-readable project name shown at the top of the PWA.'
                  value={config.siteName}
                  onChange={(v) => updateSiteField('siteName', v)}
                />
                <TextField
                  label='Board Name'
                  help='ESPHome device name and firmware identity.'
                  value={config.boardName}
                  onChange={(v) => updateSiteField('boardName', v)}
                />
                <TextField
                  label='Board IP'
                  help='Local board IP used by the PWA to read and write values.'
                  value={config.boardIp}
                  onChange={(v) => updateSiteField('boardIp', v)}
                />
                <TextField
                  label='Wi-Fi SSID'
                  help='Wi-Fi network visible to the board.'
                  value={config.wifiSsid}
                  onChange={(v) => updateSiteField('wifiSsid', v)}
                />
                <TextField
                  label='Customer / Project'
                  help='Optional customer or project reference for the commissioning record.'
                  value={config.customerName}
                  onChange={(v) => updateSiteField('customerName', v)}
                />
                <TextField
                  label='Timezone'
                  help='Timezone used for reports and future scheduling features.'
                  value={config.timezone}
                  onChange={(v) => updateSiteField('timezone', v)}
                />
              </div>
            </div>

            <div className='panel'>
              <h2>Control Defaults</h2>
              <p className='help-text'>
                These settings define the PV-DG synch-control behavior.
              </p>
              <div className='form-grid'>
                <SelectField
                  label='Controller Mode'
                  help={controllerModeHelp[config.controllerMode]}
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
                  help={controlFieldHelp.pvRatedKw}
                  value={config.pvRatedKw}
                  onChange={(v) => updateSiteField('pvRatedKw', v)}
                />
                <NumberField
                  label='Deadband kW'
                  help={controlFieldHelp.deadbandKw}
                  value={config.deadbandKw}
                  onChange={(v) => updateSiteField('deadbandKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Control Gain'
                  help={controlFieldHelp.controlGain}
                  value={config.controlGain}
                  onChange={(v) => updateSiteField('controlGain', v)}
                  step={0.01}
                />
                <NumberField
                  label='Export Limit kW'
                  help={controlFieldHelp.exportLimitKw}
                  value={config.exportLimitKw}
                  onChange={(v) => updateSiteField('exportLimitKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Import Limit kW'
                  help={controlFieldHelp.importLimitKw}
                  value={config.importLimitKw}
                  onChange={(v) => updateSiteField('importLimitKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Ramp pct Step'
                  help={controlFieldHelp.rampPctStep}
                  value={config.rampPctStep}
                  onChange={(v) => updateSiteField('rampPctStep', v)}
                  step={0.1}
                />
                <NumberField
                  label='Min PV Percent'
                  help={controlFieldHelp.minPvPercent}
                  value={config.minPvPercent}
                  onChange={(v) => updateSiteField('minPvPercent', v)}
                />
                <NumberField
                  label='Max PV Percent'
                  help={controlFieldHelp.maxPvPercent}
                  value={config.maxPvPercent}
                  onChange={(v) => updateSiteField('maxPvPercent', v)}
                />
              </div>
            </div>
          </section>
        )}

        {tab === 'topology' && (
          <section className='section-grid'>
            <div className='panel'>
              <h2>Topology Wizard</h2>
              <p className='help-text'>
                Choose the electrical shape first. The rest of the policy is
                derived from this structure.
              </p>
              <div className='form-grid'>
                <SelectField
                  label='Topology Type'
                  help='Select the bus and source architecture used by the site.'
                  value={config.topologyType}
                  onChange={(v) =>
                    updateSiteField(
                      'topologyType',
                      v as SiteConfig['topologyType'],
                    )
                  }
                  options={[
                    ['SINGLE_BUS', 'SINGLE_BUS'],
                    ['SINGLE_BUS_MULTI_GEN', 'SINGLE_BUS_MULTI_GEN'],
                    ['DUAL_BUS', 'DUAL_BUS'],
                    ['DUAL_BUS_SEPARATE', 'DUAL_BUS_SEPARATE'],
                    ['DUAL_BUS_COMBINED', 'DUAL_BUS_COMBINED'],
                  ]}
                />
                <ToggleField
                  label='Net Metering Enabled'
                  help='Allow grid-connected full production or export-setpoint operation.'
                  checked={config.netMeteringEnabled}
                  onChange={(v) => updateSiteField('netMeteringEnabled', v)}
                />
                <SelectField
                  label='Grid Operating Mode'
                  help='Defines how the controller behaves when the grid is active.'
                  value={config.gridOperatingMode}
                  onChange={(v) =>
                    updateSiteField(
                      'gridOperatingMode',
                      v as SiteConfig['gridOperatingMode'],
                    )
                  }
                  options={[
                    ['full_production', 'full_production'],
                    ['export_setpoint', 'export_setpoint'],
                    ['zero_export', 'zero_export'],
                  ]}
                />
                <NumberField
                  label='Export Setpoint kW'
                  help={controlFieldHelp.exportSetpointKw}
                  value={config.exportSetpointKw}
                  onChange={(v) => updateSiteField('exportSetpointKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Zero Export Deadband kW'
                  help={controlFieldHelp.zeroExportDeadbandKw}
                  value={config.zeroExportDeadbandKw}
                  onChange={(v) => updateSiteField('zeroExportDeadbandKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Reverse Margin kW'
                  help={controlFieldHelp.reverseMarginKw}
                  value={config.reverseMarginKw}
                  onChange={(v) => updateSiteField('reverseMarginKw', v)}
                  step={0.1}
                />
                <NumberField
                  label='Ramp Up %'
                  help={controlFieldHelp.rampUpPct}
                  value={config.rampUpPct}
                  onChange={(v) => updateSiteField('rampUpPct', v)}
                  step={0.1}
                />
                <NumberField
                  label='Ramp Down %'
                  help={controlFieldHelp.rampDownPct}
                  value={config.rampDownPct}
                  onChange={(v) => updateSiteField('rampDownPct', v)}
                  step={0.1}
                />
                <NumberField
                  label='Fast Drop %'
                  help={controlFieldHelp.fastDropPct}
                  value={config.fastDropPct}
                  onChange={(v) => updateSiteField('fastDropPct', v)}
                  step={0.1}
                />
                <NumberField
                  label='Meter Timeout s'
                  help={controlFieldHelp.meterTimeoutSec}
                  value={config.meterTimeoutSec}
                  onChange={(v) => updateSiteField('meterTimeoutSec', v)}
                />
                <NumberField
                  label='Control Interval s'
                  help={controlFieldHelp.controlIntervalSec}
                  value={config.controlIntervalSec}
                  onChange={(v) => updateSiteField('controlIntervalSec', v)}
                />
                <ToggleField
                  label='Generator Override'
                  help='Allow commissioning to override the default generator minimum-load values.'
                  checked={config.generatorMinimumOverrideEnabled}
                  onChange={(v) =>
                    updateSiteField('generatorMinimumOverrideEnabled', v)
                  }
                />
                <ToggleField
                  label='Tie Signal Present'
                  help='Needed for dual-bus sites that can be combined or separated.'
                  checked={config.tieSignalPresent}
                  onChange={(v) => updateSiteField('tieSignalPresent', v)}
                />
                <SelectField
                  label='Fail-safe Mode'
                  help='Choose the safe fallback when data or topology is invalid.'
                  value={config.fallbackMode}
                  onChange={(v) =>
                    updateSiteField(
                      'fallbackMode',
                      v as SiteConfig['fallbackMode'],
                    )
                  }
                  options={[
                    ['hold_last_safe', 'hold_last_safe'],
                    ['reduce_to_safe_min', 'reduce_to_safe_min'],
                    ['manual_bypass', 'manual_bypass'],
                  ]}
                />
              </div>
            </div>
          </section>
        )}

        {tab === 'slots' && (
          <section className='section-grid'>
            <div className='panel'>
              <h2>Source Mapping</h2>
              <p className='help-text'>
                Assign the meters that define grid and generator behavior for
                the site.
              </p>
              <div className='slot-list'>
                {gridSources.map((slot) => (
                  <MappingCard
                    key={slot.id}
                    slot={slot}
                    updateSlot={updateSlot}
                    deviceOptions={deviceOptionsForRole('grid_meter')}
                  />
                ))}
                {generatorSources.map((slot) => (
                  <MappingCard
                    key={slot.id}
                    slot={slot}
                    updateSlot={updateSlot}
                    deviceOptions={deviceOptionsForRole('generator_meter')}
                  />
                ))}
              </div>
            </div>

            <div className='panel'>
              <h2>Inverter Mapping</h2>
              <p className='help-text'>
                Assign inverter groups, network side, and capacity.
              </p>
              <div className='slot-list'>
                {inverterGroups.map((slot) => (
                  <MappingCard
                    key={slot.id}
                    slot={slot}
                    updateSlot={updateSlot}
                    deviceOptions={deviceOptionsForRole('inverter')}
                  />
                ))}
              </div>
            </div>

            <div className='panel card-full'>
              <div className='panel-header'>
                <div>
                  <h2>Advanced Slot Catalog</h2>
                  <p className='help-text'>
                    Hidden by default. Use this only when you need to inspect
                    every slot entry directly.
                  </p>
                </div>
                <button
                  className='tab-button active'
                  onClick={() => setShowAdvanced((prev) => !prev)}
                >
                  {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </button>
              </div>
              {showAdvanced ? (
                <div className='slot-list'>
                  {config.slots.map((slot) => (
                    <MappingCard
                      key={`all-${slot.id}`}
                      slot={slot}
                      updateSlot={updateSlot}
                      deviceOptions={deviceOptionsForRole(slot.role)}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className='info-box'>
                  <div className='info-label'>Advanced Hidden</div>
                  <div className='info-small'>
                    The source and inverter mapping panels cover the normal
                    commissioning flow. Expand this section only for low-level
                    catalog edits.
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === 'templates' && (
          <section className='section-grid'>
            <div className='panel'>
              <h2>Rozwell / EM500 Template</h2>
              <p className='help-text'>
                Current validated meter path. Use this for grid meters and, if
                needed, generator meters on the same RS485 bus.
              </p>
              <ul className='list-block'>
                <li>Live voltage/current/power/frequency/power factor</li>
                <li>Import energy uses confirmed corrected decode</li>
                <li>Use for grid meters and generator meters</li>
                <li>Role selected per slot</li>
              </ul>
            </div>

            <div className='panel'>
              <h2>Huawei Template</h2>
              <p className='help-text'>
                Keep this as pending until site inverter validation is done.
              </p>
              <ul className='list-block'>
                <li>Pmax</li>
                <li>Actual power</li>
                <li>Command write path</li>
                <li>Deeper live testing deferred until site visit</li>
              </ul>
            </div>

            <div className='panel card-full'>
              <h2>PV-DG Synch Control Logic</h2>
              <p className='help-text'>
                {controlFieldHelp.controlLoop}{' '}
                The PWA must show the same knobs the firmware uses: controller
                mode, PV rated kW, export/import limits, gain, deadband, ramp,
                and the inverter enable/write gate.
              </p>
              <ul className='list-block'>
                <li>Grid zero export: target 0 kW</li>
                <li>Limited export: target negative export limit</li>
                <li>Limited import: target positive import limit</li>
                <li>Disabled: monitoring only</li>
                <li>Inverter write gate stays pending until site validation</li>
              </ul>
            </div>
          </section>
        )}

        {tab === 'review' && (
          <section className='section-grid'>
            <div className='panel card-full'>
              <h2>Validation Summary</h2>
              <p className='help-text'>
                This is the commissioning view. It checks topology, source
                counts, and pending risk items before export.
              </p>
              <div className='summary-grid'>
                <SummaryItem label='Topology' value={config.topologyType} />
                <SummaryItem
                  label='Grid Policy'
                  value={config.gridOperatingMode}
                />
                <SummaryItem
                  label='Net Metering'
                  value={config.netMeteringEnabled ? 'ON' : 'OFF'}
                />
                <SummaryItem
                  label='Generators'
                  value={String(enabledCounts.gens)}
                />
                <SummaryItem
                  label='Inverters'
                  value={String(enabledCounts.inverters)}
                />
                <SummaryItem
                  label='Tie Signal'
                  value={config.tieSignalPresent ? 'Present' : 'Not declared'}
                />
                <SummaryItem
                  label='Bus A Sources'
                  value={String(
                    config.slots.filter(
                      (slot) => slot.enabled && (slot.busSide || 'A') === 'A',
                    ).length,
                  )}
                />
                <SummaryItem
                  label='Bus B Sources'
                  value={String(
                    config.slots.filter(
                      (slot) => slot.enabled && slot.busSide === 'B',
                    ).length,
                  )}
                />
                <SummaryItem
                  label='Network IDs'
                  value={String(
                    new Set(
                      config.slots
                        .filter((slot) => slot.enabled)
                        .map((slot) => slot.networkId || 'main'),
                    ).size,
                  )}
                />
                <SummaryItem
                  label='Dual-Bus State'
                  value={
                    config.topologyType.startsWith('DUAL_BUS')
                      ? config.topologyType === 'DUAL_BUS_COMBINED'
                        ? 'combined'
                        : config.topologyType === 'DUAL_BUS_SEPARATE'
                          ? 'separate'
                          : 'derived'
                      : 'n/a'
                  }
                />
              </div>
              <div className='info-box' style={{ marginTop: 16 }}>
                <div className='info-label'>Warnings</div>
                <div className='info-small'>
                  {commissioningWarnings(config).join(' · ') || 'None'}
                </div>
              </div>
              <div className='info-box' style={{ marginTop: 16 }}>
                <div className='info-label'>Derived Zones</div>
                <div className='info-small'>
                  {zones.map((zone) => zone.summary).join(' · ')}
                </div>
              </div>
              <div className='panel-actions' style={{ marginTop: 16 }}>
                <TextField
                  label='Profile Name'
                  help='Name used when saving or exporting the commissioning profile.'
                  value={profileName}
                  onChange={setProfileName}
                />
                <button
                  className='tab-button active'
                  onClick={() => {
                    saveCommissioningProfile(profileName, config);
                    setNotice(`Profile "${profileName}" saved`);
                  }}
                >
                  Save Profile
                </button>
                <button
                  className='tab-button active'
                  onClick={() => {
                    const loaded = loadCommissioningProfile(profileName);
                    if (loaded) {
                      setConfig(loaded);
                      setNotice(`Profile "${profileName}" loaded`);
                    } else {
                      setNotice(`Profile "${profileName}" not found`);
                    }
                  }}
                >
                  Load Profile
                </button>
                <button
                  className='tab-button active'
                  onClick={() => {
                    const blob = new Blob(
                      [
                        JSON.stringify(
                          {
                            config,
                            zones,
                            warnings: commissioningWarnings(config),
                          },
                          null,
                          2,
                        ),
                      ],
                      { type: 'application/json;charset=utf-8' },
                    );
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${profileName.replace(/\s+/g, '_')}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                    setNotice('JSON snapshot exported');
                  }}
                >
                  Export JSON Snapshot
                </button>
              </div>
            </div>
          </section>
        )}

        {tab === 'engineer' && <EngineerActions boardIp={config.boardIp} />}

        {tab === 'yaml' && (
          <section className='panel'>
            <div className='panel-header'>
              <h2>Generated ESPHome Package Manifest</h2>
              <div className='panel-actions'>
                <button
                  className='tab-button active'
                  onClick={() =>
                    navigator.clipboard.writeText(yamlPreview).catch(() => {})
                  }
                >
                  Copy Root YAML
                </button>
                <button
                  className='tab-button active'
                  onClick={() => downloadBundle(siteBundle, config.siteName)}
                >
                  Download Bundle
                </button>
              </div>
            </div>
            <textarea value={yamlPreview} readOnly className='yaml-box' />
            <div className='info-box' style={{ marginTop: 12 }}>
              <div className='info-label'>Bundle Contents</div>
              <div className='info-small'>
                {siteBundle.map((file) => file.name).join(' · ')}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const templateHelp: Record<DeviceType, string> = {
  none: 'Unused slot',
  em500: 'Validated EM500 / Rozwell meter template',
  em500_v2: 'EM500-compatible meter with alternate mapping',
  em500_generator: 'EM500 profile reused for generator metering',
  huawei: 'Huawei inverter template, read path only for now',
  huawei_smartlogger: 'Huawei gateway or SmartLogger profile',
  generic_modbus: 'Fallback profile for a new Modbus device',
};

function slotSummaryHelp(slot: SourceSlot) {
  if (!slot.enabled) return 'Slot is disabled.';
  if (slot.role === 'grid_meter') return 'Primary grid metering slot.';
  if (slot.role === 'generator_meter') return 'Generator metering slot.';
  if (slot.role === 'inverter') return 'Inverter role slot.';
  return 'Commissioning slot with no assigned role.';
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='stat-card'>
      <div className='stat-label'>{label}</div>
      <div className='stat-value'>{value}</div>
    </div>
  );
}

function MappingCard({
  slot,
  updateSlot,
  deviceOptions,
  compact = false,
}: {
  slot: SourceSlot;
  updateSlot: (slotId: string, patch: Partial<SourceSlot>) => void;
  deviceOptions: Array<[DeviceType, string]>;
  compact?: boolean;
}) {
  return (
    <div className='slot-card'>
      <h2>{slot.label}</h2>
      <p className='help-text'>{slotSummaryHelp(slot)}</p>
      <div className='form-grid'>
        <ToggleField
          label='Enabled'
          help='Include this entry in the commissioning model.'
          checked={slot.enabled}
          onChange={(v) => updateSlot(slot.id, { enabled: v })}
        />
        <SelectField
          label='Device Type'
          help={deviceHelp[slot.deviceType]}
          value={slot.deviceType}
          onChange={(v) => updateSlot(slot.id, { deviceType: v as DeviceType })}
          options={deviceOptions}
        />
        <SelectField
          label='Role'
          help={roleHelp[slot.role]}
          value={slot.role}
          onChange={(v) => {
            const nextRole = v as SourceRole;
            const nextOptions = deviceOptionsForRole(nextRole);
            const currentValid = nextOptions.some(
              ([deviceType]) => deviceType === slot.deviceType,
            );
            updateSlot(slot.id, {
              role: nextRole,
              deviceType: currentValid ? slot.deviceType : (nextOptions[0]?.[0] ?? 'none'),
            });
          }}
          options={[
            ['none', 'none'],
            ['grid_meter', 'grid_meter'],
            ['generator_meter', 'generator_meter'],
            ['inverter', 'inverter'],
          ]}
        />
        <NumberField
          label='Modbus ID'
          help='Slave ID used on the RS485 bus.'
          value={slot.modbusId}
          onChange={(v) => updateSlot(slot.id, { modbusId: v })}
        />
        <NumberField
          label='Capacity kW'
          help='Nominal capacity used for documentation and sizing.'
          value={slot.capacityKw}
          onChange={(v) => updateSlot(slot.id, { capacityKw: v })}
          step={0.1}
        />
        <TextField
          label='Network ID'
          help='Logical network assignment for combined or separate operation.'
          value={slot.networkId || ''}
          onChange={(v) => updateSlot(slot.id, { networkId: v })}
        />
        <SelectField
          label='Bus Side'
          help='Assign this source or inverter to bus A, bus B, or both.'
          value={slot.busSide || 'A'}
          onChange={(v) => updateSlot(slot.id, { busSide: v as 'A' | 'B' | 'both' })}
          options={[
            ['A', 'A'],
            ['B', 'B'],
            ['both', 'both'],
          ]}
        />
        {slot.role === 'generator_meter' ? (
          <SelectField
            label='Generator Type'
            help='Diesel and gas defaults drive minimum loading policy.'
            value={slot.generatorType || 'diesel'}
            onChange={(v) =>
              updateSlot(slot.id, { generatorType: v as 'diesel' | 'gas' })
            }
            options={[
              ['diesel', 'diesel'],
              ['gas', 'gas'],
            ]}
          />
        ) : null}
        {!compact ? (
          <>
            <TextField
              label='IP Hint / Notes'
              help='Optional IP hint or field note for commissioning.'
              value={slot.ipHint || ''}
              onChange={(v) => updateSlot(slot.id, { ipHint: v })}
            />
            <TextField
              label='Commissioning Notes'
              help='Additional site-specific notes.'
              value={slot.notes || ''}
              onChange={(v) => updateSlot(slot.id, { notes: v })}
            />
            </>
        ) : null}
      </div>
      {!compact ? (
        <div className='slot-help'>Template hint: {templateHelp[slot.deviceType]}</div>
      ) : null}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='stat-card'>
      <div className='stat-label'>{label}</div>
      <div className='stat-value'>{value}</div>
    </div>
  );
}


function downloadBundle(
  files: Array<{ name: string; content: string }>,
  siteName: string,
) {
  const payload = files
    .map(
      (file) => `--- ${file.name} ---
${file.content}`,
    )
    .join('\n');
  const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${siteName.replace(/\s+/g, '_').toLowerCase()}_site_bundle.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function TextField({
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
  return (
    <label className='field'>
      <span className='field-label'>{label}</span>
      {help ? <span className='field-help'>{help}</span> : null}
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

export default App;
