export type BoardWhoami = {
  deviceName: string;
  controllerId?: string;
  mac?: string;
  ip?: string;
  fwVersion?: string;
  webUiUrl?: string;
  capabilities?: Record<string, unknown>;
};

export type ProvisionWifiRequest = {
  ssid: string;
  password: string;
};

export type ProvisionWifiResponse = {
  accepted: boolean;
  jobId: string;
};

export type ProvisionStatusResponse = {
  jobId: string;
  state: 'idle' | 'connecting' | 'connected' | 'failed';
  message?: string;
};

function safeUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

/** Extract host from a discovery/probe base URL (IPv4 / mDNS). */
export function boardIpFromBaseUrl(baseUrl: string): string | null {
  const raw = baseUrl.trim();
  if (!raw) return null;
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
    const u = new URL(normalized);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const host = u.hostname.trim();
    if (!host || host.includes(':')) return null;
    return host;
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string, timeoutMs = 4500): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        cache: 'no-store',
        headers: {
          accept: 'application/json',
        },
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      // retry
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function authHeaders(token: string | null | undefined): Record<string, string> {
  const t = token?.trim();
  return t ? { 'X-PVDG-Token': t } : {};
}

async function postJson<T>(
  url: string,
  payload: unknown,
  token?: string | null,
  timeoutMs = 6500,
): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', ...authHeaders(token) },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function probeBoard(baseUrl: string): Promise<BoardWhoami | null> {
  const base = safeUrl(baseUrl);

  const whoami = await fetchJson<BoardWhoami>(`${base}/whoami`);
  if (whoami?.deviceName) return whoami;

  return null;
}

export function discoveryCandidates(boardName: string): Array<{ label: string; baseUrl: string }> {
  const trimmed = boardName.trim();
  const candidates: Array<{ label: string; baseUrl: string }> = [
    { label: 'AP mode (192.168.4.1)', baseUrl: 'http://192.168.4.1' },
  ];
  if (trimmed) {
    candidates.push({
      label: `LAN mDNS (${trimmed}.local)`,
      baseUrl: `http://${trimmed}.local`,
    });
  }
  return candidates;
}

export async function provisionWifi(
  baseUrl: string,
  req: ProvisionWifiRequest,
  token?: string | null,
): Promise<ProvisionWifiResponse | null> {
  const base = safeUrl(baseUrl);
  return postJson<ProvisionWifiResponse>(`${base}/provision_wifi`, req, token);
}

export async function fetchProvisionStatus(
  baseUrl: string,
  token?: string | null,
): Promise<ProvisionStatusResponse | null> {
  const base = safeUrl(baseUrl);
  const url = `${base}/provision_status`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2200);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { accept: 'application/json', ...authHeaders(token) },
    });
    if (!res.ok) return null;
    return (await res.json()) as ProvisionStatusResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function pairController(baseUrl: string): Promise<{ token: string } | null> {
  const base = safeUrl(baseUrl);
  return postJson<{ token: string }>(`${base}/pair`, {});
}

