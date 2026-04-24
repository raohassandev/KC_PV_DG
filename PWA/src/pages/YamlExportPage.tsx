import type { SiteBundleFile } from '../siteBundleGenerator';
import { downloadSiteBundle } from '../siteBundleGenerator';

export type YamlExportPageProps = {
  yamlPreview: string;
  siteBundle: SiteBundleFile[];
  rootPackageManifest: string;
  siteName: string;
};

export function YamlExportPage({
  yamlPreview,
  siteBundle,
  rootPackageManifest,
  siteName,
}: YamlExportPageProps) {
  return (
    <section className='panel'>
      <div className='panel-header'>
        <h2>YAML preview</h2>
        <div className='panel-actions'>
          <button
            type='button'
            className='btn btn--secondary'
            onClick={() => navigator.clipboard.writeText(rootPackageManifest).catch(() => {})}
          >
            Copy package manifest
          </button>
          <button
            type='button'
            className='btn btn--primary'
            onClick={() => downloadSiteBundle(siteBundle, siteName)}
          >
            Download Bundle
          </button>
        </div>
      </div>
      <textarea value={yamlPreview} readOnly className='yaml-box' data-testid='yaml-preview' />
      <div className='info-box u-mt-sm'>
        <div className='info-label'>Bundle contents</div>
        <div className='info-small'>
          Preview shows <strong>site.config.yaml</strong> (catalog, slots, firmware flags).{' '}
          <strong>Copy package manifest</strong> copies the root ESPHome{' '}
          <code className='inline-code'>packages:</code> file for flash. Full bundle:{' '}
          {siteBundle.map((file) => file.name).join(' · ')}
        </div>
      </div>
    </section>
  );
}
