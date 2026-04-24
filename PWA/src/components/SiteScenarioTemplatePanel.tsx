import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useSiteTemplateManifest } from '../context/SiteTemplateManifestContext';
import { fetchExternalSiteConfig, resolveScenarioTemplateTitle } from '../externalSiteTemplates';
import { SITE_SCENARIO_TEMPLATES, type SiteScenarioTemplateId } from '../siteScenarioTemplates';
import type { SiteConfig } from '../siteTemplates';

const LS_PICKER = 'pvdg.siteTemplatePickerId';

function isValidSelection(
  v: string,
  externals: ReturnType<typeof useSiteTemplateManifest>['externals'],
): boolean {
  if (v.startsWith('builtin:')) {
    return SITE_SCENARIO_TEMPLATES.some((t) => t.id === v.slice('builtin:'.length));
  }
  if (v.startsWith('external:')) {
    return externals.some((e) => e.id === v.slice('external:'.length));
  }
  return SITE_SCENARIO_TEMPLATES.some((t) => t.id === v);
}

function normalizeSavedPicker(
  raw: string | null,
  externals: ReturnType<typeof useSiteTemplateManifest>['externals'],
): string | null {
  if (!raw) return null;
  let v = raw;
  if (!raw.startsWith('builtin:') && !raw.startsWith('external:')) {
    v = SITE_SCENARIO_TEMPLATES.some((t) => t.id === raw) ? `builtin:${raw}` : raw;
  }
  return isValidSelection(v, externals) ? v : null;
}

type Props = {
  config: SiteConfig;
  setConfig: Dispatch<SetStateAction<SiteConfig>>;
  setNotice: (msg: string | null) => void;
};

export function SiteScenarioTemplatePanel({ config, setConfig, setNotice }: Props) {
  const { externals, loading: manifestLoading, error: manifestError, refetch } =
    useSiteTemplateManifest();
  const [selected, setSelected] = useState<string>(
    () => `builtin:${SITE_SCENARIO_TEMPLATES[0].id}`,
  );
  const [applyBusy, setApplyBusy] = useState(false);
  const pickerHydrated = useRef(false);

  const scenarioTitle = useMemo(
    () => resolveScenarioTemplateTitle(config.commissioningScenarioTemplateId, externals),
    [config.commissioningScenarioTemplateId, externals],
  );

  const builtinActive = selected.startsWith('builtin:')
    ? SITE_SCENARIO_TEMPLATES.find((t) => t.id === selected.slice('builtin:'.length))
    : undefined;
  const externalActive = selected.startsWith('external:')
    ? externals.find((e) => e.id === selected.slice('external:'.length))
    : undefined;

  useEffect(() => {
    if (manifestLoading || pickerHydrated.current) return;
    try {
      const raw = localStorage.getItem(LS_PICKER);
      const next = normalizeSavedPicker(raw, externals);
      if (next) setSelected(next);
    } catch {
      /* ignore */
    } finally {
      pickerHydrated.current = true;
    }
  }, [manifestLoading, externals]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_PICKER, selected);
    } catch {
      /* ignore */
    }
  }, [selected]);

  const onApply = async () => {
    if (selected.startsWith('builtin:')) {
      const id = selected.slice('builtin:'.length) as SiteScenarioTemplateId;
      const t = SITE_SCENARIO_TEMPLATES.find((x) => x.id === id);
      if (!t) return;
      const ok = window.confirm(
        'Replace the current site configuration with this template? You can still edit every field afterward. This overwrites the in-memory site (saved browser profile is unchanged until you save again).',
      );
      if (!ok) return;
      setConfig(t.build());
      setNotice(`Loaded site template: ${t.title}`);
      return;
    }

    if (selected.startsWith('external:')) {
      const id = selected.slice('external:'.length);
      const entry = externals.find((e) => e.id === id);
      if (!entry) {
        setNotice('Selected JSON preset is not available');
        return;
      }
      const ok = window.confirm(
        `Replace the current site with JSON preset "${entry.title}"? You can edit all fields afterward.`,
      );
      if (!ok) return;
      setApplyBusy(true);
      try {
        const cfg = await fetchExternalSiteConfig(entry.configUrl);
        setConfig(cfg);
        setNotice(`Loaded JSON preset: ${entry.title}`);
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Could not load preset JSON');
      } finally {
        setApplyBusy(false);
      }
    }
  };

  const onClearLabel = () => {
    setConfig((prev) => ({ ...prev, commissioningScenarioTemplateId: null }));
    setNotice('Removed scenario template label from site (YAML export will omit it).');
  };

  const topologyLabel =
    builtinActive?.topologyType ?? externalActive?.topologyType ?? '—';

  return (
    <div className='panel site-template-panel'>
      <h2>Site commissioning template</h2>
      <p className='help-text'>
        <strong>Built-in</strong> presets match each firmware topology type. <strong>JSON presets</strong>{' '}
        ship under <code className='inline-code'>public/site-templates/</code> (manifest + files); add
        customer copies there without rebuilding the app. The same built-in list is summarized under{' '}
        <strong>Templates</strong> → Site commissioning templates.
      </p>
      {manifestError ? (
        <div className='info-box u-mt-sm' role='status'>
          <div className='info-label'>JSON presets unavailable</div>
          <div className='info-small'>{manifestError}</div>
          <button type='button' className='btn btn--secondary u-mt-sm' onClick={() => refetch()}>
            Retry manifest
          </button>
        </div>
      ) : null}
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
          <span className='field-help'>
            Built-in topology presets and lazy-loaded JSON library (when manifest is present).
          </span>
          <select
            className='field-input'
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={manifestLoading}
            data-testid='site-template-select'
          >
            <optgroup label='Built-in (topology)'>
              {SITE_SCENARIO_TEMPLATES.map((t) => (
                <option key={t.id} value={`builtin:${t.id}`}>
                  {t.title}
                </option>
              ))}
            </optgroup>
            {externals.length > 0 ? (
              <optgroup label='JSON presets (public/site-templates)'>
                {externals.map((e) => (
                  <option key={e.id} value={`external:${e.id}`}>
                    {e.title}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
        <button
          type='button'
          className='btn btn--primary site-template-panel__apply'
          onClick={() => void onApply()}
          disabled={applyBusy || manifestLoading}
          data-testid='site-template-apply'
        >
          {applyBusy ? 'Loading…' : 'Load template'}
        </button>
      </div>
      {builtinActive ? (
        <>
          <p className='help-text u-mt-sm'>{builtinActive.description}</p>
          <dl className='site-template-panel__meta u-mt-sm'>
            <div>
              <dt>Topology type</dt>
              <dd>
                <code className='inline-code'>{topologyLabel}</code>
              </dd>
            </div>
          </dl>
          <details className='site-template-panel__doc u-mt-md'>
            <summary>Template notes for commissioning</summary>
            <pre className='site-template-panel__doc-pre'>{builtinActive.documentation}</pre>
          </details>
        </>
      ) : null}
      {externalActive && !builtinActive ? (
        <>
          <p className='help-text u-mt-sm'>{externalActive.description}</p>
          <dl className='site-template-panel__meta u-mt-sm'>
            <div>
              <dt>Topology type</dt>
              <dd>
                <code className='inline-code'>{topologyLabel}</code>
              </dd>
            </div>
            <div>
              <dt>Preset file</dt>
              <dd>
                <code className='inline-code'>{externalActive.configUrl}</code>
              </dd>
            </div>
          </dl>
          {externalActive.documentation ? (
            <details className='site-template-panel__doc u-mt-md' open>
              <summary>Preset notes</summary>
              <pre className='site-template-panel__doc-pre'>{externalActive.documentation}</pre>
            </details>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
