import { useMemo } from 'react';
import { snapshotCommissioning } from '../policySchema';
import type { SiteConfig } from '../siteProfileSchema';
import { controlFieldHelp } from '../siteTemplates';
import { NumberField, SelectField, ToggleField } from './commissioningFields';

const TOPOLOGY_TYPE_OPTIONS: Array<[SiteConfig['topologyType'], string]> = [
  ['SINGLE_BUS', 'Single bus — one MV / PCC grouping'],
  ['SINGLE_BUS_MULTI_GEN', 'Single bus — multiple generators'],
  ['DUAL_BUS', 'Dual bus — structure TBD in slots'],
  ['DUAL_BUS_SEPARATE', 'Dual bus — buses operated separately'],
  ['DUAL_BUS_COMBINED', 'Dual bus — tie closed / combined zone'],
];

const TOPOLOGY_SUMMARY_LABEL: Record<string, string> = {
  combined: 'Dual-bus combined',
  separate: 'Dual-bus separate',
  'derived-both': 'Dual-bus: A + B from slots',
  'derived-a-only': 'Dual-bus: bus A only (slots)',
  'derived-b-only': 'Dual-bus: bus B only (slots)',
  ambiguous: 'Dual-bus: ambiguous mapping',
};

const TOPOLOGY_SUMMARY_HELP: Record<string, string> = {
  combined: 'Profile requests a single combined electrical zone.',
  separate: 'Profile keeps two buses isolated by policy.',
  'derived-both': 'Slots map to both bus A and bus B.',
  'derived-a-only': 'All enabled sources map to bus A only.',
  'derived-b-only': 'All enabled sources map to bus B only.',
  ambiguous: 'Bus assignment from slots is ambiguous — refine Source Slots.',
};

function TopologySchematic({ topologyType }: { topologyType: SiteConfig['topologyType'] }) {
  const dual = topologyType.startsWith('DUAL_BUS');
  const combined = topologyType === 'DUAL_BUS_COMBINED';
  return (
    <div
      className={`topology-schematic ${dual ? 'topology-schematic--dual' : ''} ${combined ? 'topology-schematic--combined' : ''}`}
      aria-hidden='true'
    >
      {dual ? (
        <>
          <div className='topology-schematic__rail topology-schematic__rail--a'>
            <span className='topology-schematic__bus-label'>Bus A</span>
            <span className='topology-schematic__bus' />
            <span className='topology-schematic__tap'>Grid / loads</span>
          </div>
          <div className='topology-schematic__tie-wrap'>
            <span className='topology-schematic__tie' />
            <span className='topology-schematic__tie-label'>
              {combined ? 'Tie (combined)' : 'Tie / interlock'}
            </span>
          </div>
          <div className='topology-schematic__rail topology-schematic__rail--b'>
            <span className='topology-schematic__bus-label'>Bus B</span>
            <span className='topology-schematic__bus' />
            <span className='topology-schematic__tap'>Gen / PV groups</span>
          </div>
        </>
      ) : (
        <div className='topology-schematic__rail topology-schematic__rail--single'>
          <span className='topology-schematic__bus-label'>Main bus</span>
          <span className='topology-schematic__bus' />
          <div className='topology-schematic__nodes'>
            <span>Grid</span>
            <span>PV</span>
            <span>{topologyType === 'SINGLE_BUS_MULTI_GEN' ? 'Gen ×n' : 'Gen'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

type Props = {
  config: SiteConfig;
  updateSiteField: <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => void;
};

export function TopologyWizard({ config, updateSiteField }: Props) {
  const snap = useMemo(
    () => snapshotCommissioning('topology-wizard', config),
    [config],
  );
  const summaryLabel =
    TOPOLOGY_SUMMARY_LABEL[snap.topologySummary] ?? snap.topologySummary.replace(/-/g, ' ');
  const summaryHelp =
    TOPOLOGY_SUMMARY_HELP[snap.topologySummary] ?? 'Derived from topology type and slot bus sides.';

  return (
    <section className='topology-page' aria-labelledby='topology-page-title'>
      <div className='topology-page-intro panel'>
        <h2 id='topology-page-title'>Topology wizard</h2>
        <p className='help-text'>
          Set the <strong>electrical shape</strong> first, then grid and export behavior, then timing
          and safety. Policy and YAML use this ordering. Fields stay visible for field engineers (see
          implementation checklist — Stage&nbsp;C). For a matching slot map and defaults, start from{' '}
          <strong>Site Setup → Site commissioning template</strong>, then return here to tune policy
          fields.
        </p>
        <div className='topology-page-intro-grid'>
          <div className='topology-summary-card'>
            <h3 className='topology-panel-title'>Live summary</h3>
            <p className='topology-summary-card__primary'>{summaryLabel}</p>
            <p className='help-text topology-summary-card__hint'>{summaryHelp}</p>
            <ul className='topology-zone-list'>
              {snap.zones.map((z) => (
                <li key={z.id}>{z.summary}</li>
              ))}
            </ul>
            {snap.warnings.length > 0 ? (
              <div className='topology-warnings'>
                <strong>Warnings</strong>
                <ul>
                  {snap.warnings.slice(0, 4).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
                {snap.warnings.length > 4 ? (
                  <p className='help-text'>See Validation tab for the full list.</p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className='topology-schematic-wrap panel topology-schematic-panel'>
            <h3 className='topology-panel-title'>Schematic (profile)</h3>
            <TopologySchematic topologyType={config.topologyType} />
            <p className='help-text'>
              Illustrates the selected topology type. Precise mapping is in{' '}
              <strong>Source Slots</strong> (bus side, network ID).
            </p>
          </div>
        </div>
      </div>

      <div className='topology-panels'>
        <div className='panel topology-panel'>
          <h3 className='topology-panel-title'>
            <span className='topology-panel-step'>1</span> Electrical topology
          </h3>
          <p className='help-text'>Bus model and signals that constrain dual-bus operation.</p>
          <div className='form-grid topology-form-grid'>
            <SelectField
              label='Topology type'
              help='Select the bus and source architecture used by the site.'
              value={config.topologyType}
              onChange={(v) => updateSiteField('topologyType', v as SiteConfig['topologyType'])}
              options={TOPOLOGY_TYPE_OPTIONS}
            />
            <ToggleField
              label='Tie signal present'
              help='Needed for dual-bus sites that can be combined or separated.'
              checked={config.tieSignalPresent}
              onChange={(v) => updateSiteField('tieSignalPresent', v)}
            />
          </div>
        </div>

        <div className='panel topology-panel'>
          <h3 className='topology-panel-title'>
            <span className='topology-panel-step'>2</span> Grid &amp; export policy
          </h3>
          <p className='help-text'>How the site interacts with the utility while exporting or limiting power.</p>
          <div className='form-grid topology-form-grid'>
            <ToggleField
              label='Net metering enabled'
              help='Allow grid-connected full production or export-setpoint operation.'
              checked={config.netMeteringEnabled}
              onChange={(v) => updateSiteField('netMeteringEnabled', v)}
            />
            <SelectField
              label='Grid operating mode'
              help='Defines how the controller behaves when the grid is active.'
              value={config.gridOperatingMode}
              onChange={(v) =>
                updateSiteField('gridOperatingMode', v as SiteConfig['gridOperatingMode'])
              }
              options={[
                ['full_production', 'Full production'],
                ['export_setpoint', 'Export setpoint'],
                ['zero_export', 'Zero export'],
              ]}
            />
            <NumberField
              label='Export setpoint kW'
              help={controlFieldHelp.exportSetpointKw}
              value={config.exportSetpointKw}
              onChange={(v) => updateSiteField('exportSetpointKw', v)}
              step={0.1}
            />
            <NumberField
              label='Zero export deadband kW'
              help={controlFieldHelp.zeroExportDeadbandKw}
              value={config.zeroExportDeadbandKw}
              onChange={(v) => updateSiteField('zeroExportDeadbandKw', v)}
              step={0.1}
            />
            <NumberField
              label='Reverse margin kW'
              help={controlFieldHelp.reverseMarginKw}
              value={config.reverseMarginKw}
              onChange={(v) => updateSiteField('reverseMarginKw', v)}
              step={0.1}
            />
            <NumberField
              label='Ramp up %'
              help={controlFieldHelp.rampUpPct}
              value={config.rampUpPct}
              onChange={(v) => updateSiteField('rampUpPct', v)}
              step={0.1}
            />
            <NumberField
              label='Ramp down %'
              help={controlFieldHelp.rampDownPct}
              value={config.rampDownPct}
              onChange={(v) => updateSiteField('rampDownPct', v)}
              step={0.1}
            />
            <NumberField
              label='Fast drop %'
              help={controlFieldHelp.fastDropPct}
              value={config.fastDropPct}
              onChange={(v) => updateSiteField('fastDropPct', v)}
              step={0.1}
            />
          </div>
        </div>

        <div className='panel topology-panel'>
          <h3 className='topology-panel-title'>
            <span className='topology-panel-step'>3</span> Metering &amp; control timing
          </h3>
          <p className='help-text'>Timeouts and loop interval for meter and control updates.</p>
          <div className='form-grid topology-form-grid'>
            <NumberField
              label='Meter timeout s'
              help={controlFieldHelp.meterTimeoutSec}
              value={config.meterTimeoutSec}
              onChange={(v) => updateSiteField('meterTimeoutSec', v)}
            />
            <NumberField
              label='Control interval s'
              help={controlFieldHelp.controlIntervalSec}
              value={config.controlIntervalSec}
              onChange={(v) => updateSiteField('controlIntervalSec', v)}
            />
          </div>
        </div>

        <div className='panel topology-panel'>
          <h3 className='topology-panel-title'>
            <span className='topology-panel-step'>4</span> Safety &amp; overrides
          </h3>
          <p className='help-text'>Generator commissioning flags and fail-safe when data is invalid.</p>
          <div className='form-grid topology-form-grid'>
            <ToggleField
              label='Generator override'
              help='Allow commissioning to override the default generator minimum-load values.'
              checked={config.generatorMinimumOverrideEnabled}
              onChange={(v) => updateSiteField('generatorMinimumOverrideEnabled', v)}
            />
            <SelectField
              label='Fail-safe mode'
              help='Choose the safe fallback when data or topology is invalid.'
              value={config.fallbackMode}
              onChange={(v) =>
                updateSiteField('fallbackMode', v as SiteConfig['fallbackMode'])
              }
              options={[
                ['hold_last_safe', 'Hold last safe'],
                ['reduce_to_safe_min', 'Reduce to safe min'],
                ['manual_bypass', 'Manual bypass'],
              ]}
            />
          </div>
        </div>

        <aside className='panel topology-aside' aria-label='Data paths and TCP IP'>
          <h3 className='topology-panel-title'>Live data &amp; TCP/IP</h3>
          <ul className='topology-aside-list'>
            <li>
              <strong>Dashboard</strong> polls the board over <strong>HTTP</strong> to the IP in Site
              Setup (ESPHome-style REST entities). The browser does not open raw TCP sockets to meters
              or inverters.
            </li>
            <li>
              <strong>Modbus TCP</strong> (and RTU) is handled on the LAN by firmware / gateways; map
              devices in <strong>Source Slots</strong> with Modbus unit IDs and IP hints for the field
              record.
            </li>
            <li>
              <strong>Dynamic Zero Export</strong> can read live <code>/api/topology</code>, snapshot,
              and diagnostics over <strong>HTTP(S)</strong> when a controller base URL is configured —
              still not raw Modbus from the PWA.
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
