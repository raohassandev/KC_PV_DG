import type { SiteConfig } from '../domain/siteProfileSchema';

function safeBaseUrl(raw: string): string {
  const t = raw.trim().replace(/\/+$/, '');
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `http://${t}`;
}

export async function fetchSiteConfig(baseUrl: string): Promise<SiteConfig> {
  const base = safeBaseUrl(baseUrl);
  if (!base) throw new Error('Controller base URL is empty');
  return fetchSiteConfigAuthed(baseUrl, null);
}

export async function fetchSiteConfigAuthed(baseUrl: string, token: string | null): Promise<SiteConfig> {
  const base = safeBaseUrl(baseUrl);
  if (!base) throw new Error('Controller base URL is empty');
  const res = await fetch(`${base}/site/config`, {
    headers: { accept: 'application/json', ...(token ? { 'X-PVDG-Token': token } : {}) },
  });
  if (!res.ok) throw new Error(`GET /site/config failed (${res.status})`);
  const j = (await res.json()) as SiteConfig;
  return j;
}

export async function putSiteConfig(baseUrl: string, config: SiteConfig): Promise<void> {
  const base = safeBaseUrl(baseUrl);
  if (!base) throw new Error('Controller base URL is empty');
  return putSiteConfigAuthed(baseUrl, config, null);
}

export async function putSiteConfigAuthed(baseUrl: string, config: SiteConfig, token: string | null): Promise<void> {
  const base = safeBaseUrl(baseUrl);
  if (!base) throw new Error('Controller base URL is empty');
  const res = await fetch(`${base}/site/config`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(token ? { 'X-PVDG-Token': token } : {}),
    },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`PUT /site/config failed (${res.status})`);
}

