import { FormGrid } from '../layout/FormGrid';
import { MappingCard } from '../components/MappingCard';
import type { SourceSlot, SiteConfig } from '../siteTemplates';
import { deviceOptionsForRole } from '../siteTemplates';

export type SourceSlotsPageProps = {
  config: SiteConfig;
  gridSources: SourceSlot[];
  generatorSources: SourceSlot[];
  inverterGroups: SourceSlot[];
  updateSlot: (slotId: string, patch: Partial<SourceSlot>) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean | ((p: boolean) => boolean)) => void;
};

export function SourceSlotsPage({
  config,
  gridSources,
  generatorSources,
  inverterGroups,
  updateSlot,
  showAdvanced,
  setShowAdvanced,
}: SourceSlotsPageProps) {
  return (
    <FormGrid>
      <div className='panel'>
        <h2>Source Mapping</h2>
        <p className='help-text'>
          Assign the meters that define grid and generator behavior for the site.
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
        <p className='help-text'>Assign inverter groups, network side, and capacity.</p>
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
              Hidden by default. Use this only when you need to inspect every slot entry directly.
            </p>
          </div>
          <button
            type='button'
            className='btn btn--secondary'
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
              The source and inverter mapping panels cover the normal commissioning flow. Expand this
              section only for low-level catalog edits.
            </div>
          </div>
        )}
      </div>
    </FormGrid>
  );
}
