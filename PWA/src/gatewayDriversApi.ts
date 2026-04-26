import type { DriverDefinition, DriverMeta } from './types/driverLibrary';

export async function fetchDrivers(fetchGateway: (path: string, init?: RequestInit) => Promise<Response>): Promise<DriverMeta[]> {
  const res = await fetchGateway('/api/drivers', { method: 'GET' });
  if (!res.ok) throw new Error('Failed to load drivers');
  const j = (await res.json().catch(() => null)) as { drivers?: DriverMeta[] } | null;
  return Array.isArray(j?.drivers) ? j!.drivers : [];
}

export async function fetchDriver(
  fetchGateway: (path: string, init?: RequestInit) => Promise<Response>,
  driverId: string,
): Promise<DriverDefinition> {
  const res = await fetchGateway(`/api/drivers/${encodeURIComponent(driverId)}`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to load driver');
  const j = (await res.json().catch(() => null)) as { driver?: DriverDefinition } | null;
  if (!j?.driver) throw new Error('Invalid response');
  return j.driver;
}

export async function saveDriver(
  fetchGateway: (path: string, init?: RequestInit) => Promise<Response>,
  driverId: string,
  driver: DriverDefinition,
): Promise<DriverDefinition> {
  const res = await fetchGateway(`/api/drivers/${encodeURIComponent(driverId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driver }),
  });
  if (!res.ok) throw new Error('Failed to save driver');
  const j = (await res.json().catch(() => null)) as { driver?: DriverDefinition } | null;
  if (!j?.driver) throw new Error('Invalid response');
  return j.driver;
}

export async function deleteDriver(
  fetchGateway: (path: string, init?: RequestInit) => Promise<Response>,
  driverId: string,
): Promise<void> {
  const res = await fetchGateway(`/api/drivers/${encodeURIComponent(driverId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete driver');
}

