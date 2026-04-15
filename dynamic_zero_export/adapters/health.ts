export type AdapterHealth = 'ok' | 'warn' | 'fail';

export type AdapterState = {
  id: string;
  kind: string;
  health: AdapterHealth;
  stale: boolean;
  lastSeenAt?: string;
  message?: string;
};

export function createAdapterState(id: string, kind: string): AdapterState {
  return { id, kind, health: 'warn', stale: true };
}

