/** True when the PWA should use the VPS gateway for auth (and password change). */
export function isGatewayAuthEnabled(): boolean {
  return Boolean((import.meta.env.VITE_GATEWAY_URL as string | undefined)?.trim());
}
