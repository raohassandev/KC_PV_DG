import type { Dispatch, SetStateAction } from 'react';
import { TextField } from '../components/commissioningFields';
import { FormGrid } from '../layout/FormGrid';
import {
  loadProfile as loadCommissioningProfile,
  policyWarnings as commissioningWarnings,
  saveProfile as saveCommissioningProfile,
} from '../policySchema';
import {
  getSiteScenarioTemplate,
  type SiteScenarioTemplateId,
} from '../siteScenarioTemplates';
import type { SiteConfig } from '../siteTemplates';

type ZoneRow = { id: string; summary: string };

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='stat-card'>
      <div className='stat-label'>{label}</div>
      <div className='stat-value'>{value}</div>
    </div>
  );
}

export type CommissioningValidationPageProps = {
  config: SiteConfig;
  setConfig: Dispatch<SetStateAction<SiteConfig>>;
  profileName: string;
  setProfileName: (v: string) => void;
  zones: ZoneRow[];
  enabledCounts: {
    total: number;
    grids: number;
    gens: number;
    inverters: number;
  };
  setNotice: (v: string | null) => void;
};

export function CommissioningValidationPage({
  config,
  setConfig,
  profileName,
  setProfileName,
  zones,
  enabledCounts,
  setNotice,
}: CommissioningValidationPageProps) {
  const scenarioSummary =
    config.commissioningScenarioTemplateId &&
    (getSiteScenarioTemplate(config.commissioningScenarioTemplateId as SiteScenarioTemplateId)
      ?.title ?? config.commissioningScenarioTemplateId);

  return (
    <FormGrid>
      <div className='panel card-full'>
        <h2>Validation Summary</h2>
        <p className='help-text'>
          This is the commissioning view. It checks topology, source counts, and pending risk items
          before export.
        </p>
        <div className='summary-grid'>
          <SummaryItem label='Topology' value={config.topologyType} />
          {scenarioSummary ? (
            <SummaryItem label='Scenario template' value={scenarioSummary} />
          ) : null}
          <SummaryItem label='Grid Policy' value={config.gridOperatingMode} />
          <SummaryItem label='Net Metering' value={config.netMeteringEnabled ? 'ON' : 'OFF'} />
          <SummaryItem label='Sources enabled' value={String(enabledCounts.total)} />
          <SummaryItem label='Grid meters' value={String(enabledCounts.grids)} />
          <SummaryItem label='Generators' value={String(enabledCounts.gens)} />
          <SummaryItem label='Inverters' value={String(enabledCounts.inverters)} />
          <SummaryItem
            label='Tie Signal'
            value={config.tieSignalPresent ? 'Present' : 'Not declared'}
          />
          <SummaryItem
            label='Bus A Sources'
            value={String(
              config.slots.filter((slot) => slot.enabled && (slot.busSide || 'A') === 'A').length,
            )}
          />
          <SummaryItem
            label='Bus B Sources'
            value={String(config.slots.filter((slot) => slot.enabled && slot.busSide === 'B').length)}
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
        <div className='info-box u-mt-md'>
          <div className='info-label'>Warnings</div>
          <div className='info-small'>
            {commissioningWarnings(config).join(' · ') || 'None'}
          </div>
        </div>
        <div className='info-box u-mt-md'>
          <div className='info-label'>Derived Zones</div>
          <div className='info-small'>{zones.map((zone) => zone.summary).join(' · ')}</div>
        </div>
        <div className='panel-actions u-mt-md'>
          <TextField
            label='Profile Name'
            help='Name used when saving or exporting the commissioning profile.'
            value={profileName}
            onChange={setProfileName}
          />
          <button
            type='button'
            className='btn btn--primary'
            onClick={() => {
              saveCommissioningProfile(profileName, config);
              setNotice(`Profile "${profileName}" saved`);
            }}
          >
            Save Profile
          </button>
          <button
            type='button'
            className='btn btn--secondary'
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
            type='button'
            className='btn btn--secondary'
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
    </FormGrid>
  );
}
