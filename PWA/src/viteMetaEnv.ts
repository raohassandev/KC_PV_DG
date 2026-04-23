/**
 * Safe access to `import.meta.env` for code that may load under Node (unit tests) where `env` is absent.
 */
export function viteEnv(key: string): string | undefined {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    const v = env?.[key];
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

export function viteIsDev(): boolean {
  try {
    return Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}
