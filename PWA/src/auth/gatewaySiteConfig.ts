import { defaultSite, type SiteConfig } from '../siteTemplates';

/** Merge `pwaSiteConfig` from a gateway `GET /api/sites/:id` payload into a full `SiteConfig`. */
export function mergePwaSiteConfigFromGatewayPayload(
  payload: Record<string, unknown>,
): SiteConfig | null {
  const pwa = payload.pwaSiteConfig;
  const hasPwa = pwa && typeof pwa === 'object' && !Array.isArray(pwa);
  const modeTop =
    payload.controllerRuntimeMode === 'sync_controller' ||
    payload.controllerRuntimeMode === 'dzx_virtual_meter'
      ? payload.controllerRuntimeMode
      : undefined;

  if (!hasPwa && !modeTop) return null;

  const merged: SiteConfig = {
    ...defaultSite,
    ...(hasPwa ? (pwa as Partial<SiteConfig>) : {}),
  };
  if (modeTop) merged.controllerRuntimeMode = modeTop;
  return merged;
}
