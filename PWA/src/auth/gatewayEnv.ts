import { viteEnv } from '../viteMetaEnv';

/** True when the PWA should use the VPS gateway for auth (and password change). */
export function isGatewayAuthEnabled(): boolean {
  if (Boolean(viteEnv('VITE_GATEWAY_URL'))) return true;
  // When the PWA is served by the gateway, auth is same-origin and no env is needed.
  if (typeof window === 'undefined') return false;
  return window.location.port === '8788' || window.location.port === '8789';
}
