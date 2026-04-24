import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  SITE_SCENARIO_TEMPLATES,
  getSiteScenarioTemplate,
  type SiteScenarioTemplateId,
} from '../siteScenarioTemplates';
import type { SiteConfig } from '../siteTemplates';

const LS_PICKER = 'pvdg.siteTemplatePickerId';

function readPickerSelection(): SiteScenarioTemplateId {
  try {
    const v = localStorage.getItem(LS_PICKER);
    if (v && SITE_SCENARIO_TEMPLATES.some((t) => t.id === v)) {
      return v as SiteScenarioTemplateId;
    }
  } catch {
    /* ignore */
  }
  return SITE_SCENARIO_TEMPLATES[0].id;
}

type Props = {
  config: SiteConfig;
  setConfig: Dispatch<SetStateAction<SiteConfig>>;
  setNotice: (msg: string | null) => void;
};

export function SiteScenarioTemplatePanel({ config, setConfig, setNotice }: Props) {
  const [selected, setSelected] = useState<SiteScenarioTemplateId>(readPickerSelection);

  const scenarioTitle = useMemo(() => {
    const id = config.commissioningScenarioTemplateId;
    if (!id) return null;
    return getSiteScenarioTemplate(id as SiteScenarioTemplateId)?.title ?? id;
  }, [config.commissioningScenarioTemplateId]);

  const active = useMemo(
    () => SITE_SCENARIO_TEMPLATES.find((t) => t.id === selected),
    [selected],
  );

  useEffect(() => {
    try {
      localStorage.setItem(LS_PICKER, selected);
    } catch {
      /* ignore */
    }
  }, [selected]);

  const onApply = () => {
    const t = SITE_SCENARIO_TEMPLATES.find((x) => x.id === selected);
    if (!t) return;
    const ok = window.confirm(
      'Replace the current site configuration with this template? You can still edit every field afterward. This overwrites the in-memory site (saved browser profile is unchanged until you save again).',
    );
    if (!ok) return;
    setConfig(t.build());
    setNotice(`Loaded site template: ${t.title}`);
  };

  const onClearLabel = () => {
    setConfig((prev) => ({ ...prev, commissioningScenarioTemplateId: null }));
    setNotice('Removed scenario template label from site (YAML export will omit it).');
  };

  return (
    <div className='panel site-template-panel'>
      <h2>Site commissioning template</h2>
      <p className='help-text'>
        Each option matches one <strong>topology type</strong> the controller supports. Pick the closest
        real plant layout, load the preset, then adjust Site Setup, Topology, and Source Slots for your
        site. The same list is summarized under <strong>Templates</strong> → Site commissioning templates.
      </p>
      {scenarioTitle ? (
        <div className='site-template-panel__scenario u-mt-sm'>
          <p className='help-text' data-testid='site-template-last-applied'>
            Scenario label stored in site (exported in YAML): <strong>{scenarioTitle}</strong>
          </p>
          <button
            type='button'
            className='btn btn--secondary'
            onClick={onClearLabel}
            data-testid='site-template-clear-label'
          >
            Clear scenario label
          </button>
        </div>
      ) : null}
      <div className='site-template-panel__row'>
        <label className='field site-template-panel__field'>
          <span className='field-label'>Template</span>
          <span className='field-help'>Full site preset including topology and typical slot map.</span>
          <select
            className='field-input'
            value={selected}
            onChange={(e) => setSelected(e.target.value as SiteScenarioTemplateId)}
            data-testid='site-template-select'
          >
            {SITE_SCENARIO_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type='button'
          className='btn btn--primary site-template-panel__apply'
          onClick={onApply}
          data-testid='site-template-apply'
        >
          Load template
        </button>
      </div>
      {active ? (
        <>
          <p className='help-text u-mt-sm'>{active.description}</p>
          <dl className='site-template-panel__meta u-mt-sm'>
            <div>
              <dt>Topology type</dt>
              <dd>
                <code className='inline-code'>{active.topologyType}</code>
              </dd>
            </div>
          </dl>
          <details className='site-template-panel__doc u-mt-md'>
            <summary>Template notes for commissioning</summary>
            <pre className='site-template-panel__doc-pre'>{active.documentation}</pre>
          </details>
        </>
      ) : null}
    </div>
  );
}
