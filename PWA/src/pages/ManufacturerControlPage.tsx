/**
 * Manufacturer “Control” workspace page.
 * Per-device link timing and serial/TCP settings live under Commissioning → Source Slots
 * (Configure link & timing on each slot); values export in site.config.yaml.
 */
export function ManufacturerControlPage() {
  return (
    <section className='card card-wide'>
      <div className='card-header'>
        <div>
          <h2>Control</h2>
          <p className='help-text'>Communication defaults are now edited per device in Source Slots.</p>
        </div>
      </div>
      <div className='info-box'>
        <div className='info-label'>Where to configure</div>
        <div className='info-small'>
          Open <strong>Commissioning → Source Slots</strong>. For each meter or inverter, choose{' '}
          <span className='inline-code'>rtu</span>, <span className='inline-code'>rs232</span>, or{' '}
          <span className='inline-code'>tcp</span>, then use <strong>Configure link &amp; timing…</strong>
          (the dialog also opens when you change transport). Defaults are{' '}
          <strong>9600 N 8 1</strong> on serial and standard poll/timeout values; everything is saved with the
          site and included in <strong>YAML Export</strong> under each slot&apos;s <span className='inline-code'>link:</span>{' '}
          block.
        </div>
      </div>
    </section>
  );
}
