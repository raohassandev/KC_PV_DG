import type { SiteConfig } from './siteProfileSchema';
import { getSiteScenarioTemplate, type SiteScenarioTemplateId } from './siteScenarioTemplates';

export type ExternalSiteTemplateManifestEntry = {
  id: string;
  title: string;
  description: string;
  documentation?: string;
  topologyType: string;
  /** File name only, resolved under `site-templates/` next to manifest. */
  configUrl: string;
};

export type ExternalSiteTemplateManifest = {
  version: number;
  templates: ExternalSiteTemplateManifestEntry[];
};

function resolveSiteTemplatesUrl(pathWithinSiteTemplates: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const rel = pathWithinSiteTemplates.replace(/^\/+/, '');
  return new URL(`site-templates/${rel}`, `${window.location.origin}${base}`).href;
}

export async function fetchExternalSiteTemplateManifest(): Promise<ExternalSiteTemplateManifestEntry[]> {
  const url = resolveSiteTemplatesUrl('manifest.json');
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Could not load site preset manifest (${res.status})`);
  }
  const data = (await res.json()) as ExternalSiteTemplateManifest;
  if (!data || !Array.isArray(data.templates)) return [];
  return data.templates.filter(
    (t) =>
      t &&
      typeof t.id === 'string' &&
      typeof t.configUrl === 'string' &&
      typeof t.title === 'string',
  );
}

export async function fetchExternalSiteConfig(configFileName: string): Promise<SiteConfig> {
  const url = resolveSiteTemplatesUrl(configFileName.replace(/^\/+/, ''));
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Could not load preset JSON (${res.status})`);
  }
  return (await res.json()) as SiteConfig;
}

/** Human title for built-in or JSON manifest preset id. */
export function resolveScenarioTemplateTitle(
  id: string | null | undefined,
  externals: ExternalSiteTemplateManifestEntry[],
): string | null {
  if (!id) return null;
  const ext = externals.find((e) => e.id === id);
  if (ext) return ext.title;
  const builtin = getSiteScenarioTemplate(id as SiteScenarioTemplateId);
  if (builtin) return builtin.title;
  return id;
}
