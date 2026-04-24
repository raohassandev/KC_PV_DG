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

type EspHomeJson = {
  name?: string;
  mac_address?: string;
  compilation_time?: string;
  esphome_version?: string;
  friendly_name?: string;
  // other keys exist; we only read a few
};

function safeUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

async function fetchJson<T>(url: string, timeoutMs = 4500): Promise<T | null> {
  // ESPHome web_server v3 can occasionally stall while reading the response body.
  // Browsers cannot set the `Connection: close` header, so we retry with a fresh request.
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
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
      window.clearTimeout(timer);
    }
  }
  return null;
}

async function postJson<T>(
  url: string,
  payload: unknown,
  timeoutMs = 6500,
): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function probeBoard(baseUrl: string): Promise<BoardWhoami | null> {
  const base = safeUrl(baseUrl);

  // If a local gateway is present, prefer proxying through it to avoid ESPHome web_server v3
  // keep-alive stalls in browsers.
  try {
    const gw = await fetchJson<{ ok?: boolean; whoami?: BoardWhoami | null }>(
      `/api/board/probe?baseUrl=${encodeURIComponent(base)}`,
      2500,
    );
    if (gw?.ok && gw.whoami?.deviceName) return gw.whoami;
  } catch {
    // ignore; fall back to direct probing
  }

  // Preferred future contract
  const whoami = await fetchJson<BoardWhoami>(`${base}/whoami`);
  if (whoami?.deviceName) return whoami;

  // ESPHome web_server compatibility fallback (works today)
  const esphome = await fetchJson<EspHomeJson>(`${base}/json`);
  if (esphome?.name || esphome?.friendly_name) {
    return {
      deviceName: String(esphome.name ?? esphome.friendly_name ?? 'pv-dg-controller'),
      mac: esphome.mac_address,
      fwVersion: esphome.esphome_version,
      webUiUrl: `${base}/`,
      capabilities: {
        esphomeWebServer: true,
      },
    };
  }

  // ESPHome entity endpoints fallback: read identity from template sensors (service_ui.yaml)
  const [controllerId, fwVersion, mac] = await Promise.all([
    fetchJson<{ state?: string }>(`${base}/text_sensor/Controller%20ID`),
    fetchJson<{ state?: string }>(`${base}/text_sensor/Firmware%20Version`),
    fetchJson<{ state?: string }>(`${base}/text_sensor/MAC%20Address`),
  ]);
  if (controllerId?.state) {
    return {
      deviceName: controllerId.state,
      controllerId: controllerId.state,
      fwVersion: fwVersion?.state,
      mac: mac?.state,
      webUiUrl: `${base}/`,
      capabilities: { esphomeEntityEndpoints: true },
    };
  }

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
): Promise<ProvisionWifiResponse | null> {
  const base = safeUrl(baseUrl);
  return postJson<ProvisionWifiResponse>(`${base}/provision_wifi`, req);
}

export async function fetchProvisionStatus(
  baseUrl: string,
): Promise<ProvisionStatusResponse | null> {
  const base = safeUrl(baseUrl);
  return fetchJson<ProvisionStatusResponse>(`${base}/provision_status`, 2200);
}

