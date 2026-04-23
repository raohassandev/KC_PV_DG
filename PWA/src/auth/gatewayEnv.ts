import { viteEnv } from '../viteMetaEnv';

/** True when the PWA should use the VPS gateway for auth (and password change). */
export function isGatewayAuthEnabled(): boolean {
  return Boolean(viteEnv('VITE_GATEWAY_URL'));
}
