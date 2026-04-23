import { defaultSite, type SiteConfig } from '../siteTemplates';

/** Merge `pwaSiteConfig` from a gateway `GET /api/sites/:id` payload into a full `SiteConfig`. */
export function mergePwaSiteConfigFromGatewayPayload(
  payload: Record<string, unknown>,
): SiteConfig | null {
  const pwa = payload.pwaSiteConfig;
  if (!pwa || typeof pwa !== 'object' || Array.isArray(pwa)) return null;
  return { ...defaultSite, ...(pwa as Partial<SiteConfig>) };
}
