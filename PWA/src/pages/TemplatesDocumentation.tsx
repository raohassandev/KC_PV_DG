import { DocReaderLayout, DocReaderSection } from '../layout/DocReaderLayout';
import { SITE_SCENARIO_TEMPLATES } from '../siteScenarioTemplates';
import { controlFieldHelp } from '../siteTemplates';

export function TemplatesDocumentation() {
  return (
    <DocReaderLayout
      aria-label='Device catalogs and control documentation'
      kicker='Documentation · read-only'
      title='Catalogs & control reference'
      lede={
        <p className='help-text'>
          This tab is <strong>in-app documentation</strong>, not configuration. Bind devices in{' '}
          <strong>Source Slots</strong>; use this reader to see which meter and inverter paths are
          validated vs pending, where PDFs and YAML live, and how synch-control is meant to behave in
          firmware. Full-site presets (topology + slot map) are loaded from{' '}
          <strong>Site Setup → Site commissioning template</strong>.
        </p>
      }
    >
      <DocReaderSection title='Site commissioning templates (topologies)'>
        <p className='help-text'>
          These match every <code className='inline-code'>topologyType</code> in the commissioning model.
          Load one in Site Setup, then refine Board IP, Modbus IDs, and slot devices for the as-built
          plant.
        </p>
        <ul className='list-block'>
          {SITE_SCENARIO_TEMPLATES.map((t) => (
            <li key={t.id}>
              <strong>{t.title}</strong> — <code className='inline-code'>{t.topologyType}</code>.{' '}
              {t.description}
            </li>
          ))}
        </ul>
      </DocReaderSection>

      <DocReaderSection title='Rozwell / EM500 Template'>
        <p className='help-text'>
          Current validated meter path. Use this for grid meters and, if needed, generator meters on
          the same RS485 bus.
        </p>
        <ul className='list-block'>
          <li>Live voltage/current/power/frequency/power factor</li>
          <li>Import energy uses confirmed corrected decode</li>
          <li>Use for grid meters and generator meters</li>
          <li>Role selected per slot</li>
        </ul>
      </DocReaderSection>

      <DocReaderSection title='Huawei Template'>
        <p className='help-text'>Keep this as pending until site inverter validation is done.</p>
        <ul className='list-block'>
          <li>Pmax</li>
          <li>Actual power</li>
          <li>Command write path</li>
          <li>Deeper live testing deferred until site visit</li>
        </ul>
      </DocReaderSection>

      <DocReaderSection title='Energy analyzers (catalog)'>
        <p className='help-text'>
          Additional grid / generator meters are selectable in Source Slots. Each entry points at
          register manuals under <code className='inline-code'>docs/Energy Analyzer/</code> until a
          matching <code className='inline-code'>Modular_Yaml/meter_*.yaml</code> exists.
        </p>
        <ul className='list-block'>
          <li>WM15, KPM37, Iskra MC3, M4M map, GC/DST multiline family</li>
          <li>
            Exported bundle lists <code className='inline-code'>doc_path</code> per device and flags
            slots without bundled YAML
          </li>
          <li>Validation warns when a slot type has no firmware package yet</li>
        </ul>
      </DocReaderSection>

      <DocReaderSection title='Inverters (catalog)'>
        <p className='help-text'>
          SMA, SolarEdge, Growatt, Solax, Sungrow, Chint/CPS, Knox/ASW are commissioning labels tied to
          PDFs under <code className='inline-code'>docs/Inverter/</code>. Only Huawei maps to bundled{' '}
          <code className='inline-code'>inverter_huawei.yaml</code> today.
        </p>
        <ul className='list-block'>
          <li>Use Source Slots → Inverter Mapping to assign vendor per bus</li>
          <li>SmartLogger uses the same bundled Huawei include as a gateway placeholder</li>
          <li>Site-specific register work stays in firmware + bench validation</li>
        </ul>
      </DocReaderSection>

      <DocReaderSection title='PV-DG Synch Control Logic'>
        <p className='help-text'>
          {controlFieldHelp.controlLoop} The PWA must show the same knobs the firmware uses: controller
          mode, PV rated kW, export/import limits, gain, deadband, ramp, and the inverter enable/write
          gate.
        </p>
        <ul className='list-block'>
          <li>Grid zero export: target 0 kW</li>
          <li>Limited export: target negative export limit</li>
          <li>Limited import: target positive import limit</li>
          <li>Disabled: monitoring only</li>
          <li>Inverter write gate stays pending until site validation</li>
        </ul>
      </DocReaderSection>
    </DocReaderLayout>
  );
}
