import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import cors from 'cors';
import express from 'express';
import type { SessionState } from '../../dynamic_zero_export/pwa/contracts/session.js';
import { appendAuditLine, writeJsonAtomic } from './atomicFile.js';
import {
  changeOwnPassword,
  loadOrInitAuth,
  saveAuth,
  setSlotPasswordPlain,
  verifyLogin,
  type CredentialSlot,
  type LoginChannel,
} from './authStore.js';
import { startMqttDiscovery } from './mqttDiscovery.js';
import {
  configureSessionPersistence,
  createSession,
  deleteSession,
  getSession,
} from './sessions.js';

const PORT = Number(process.env.PORT ?? 8788);
const CONFIG_DIR = process.env.CONFIG_DIR ?? join(process.cwd(), 'data', 'config');
const SITES_DIR = join(CONFIG_DIR, 'sites');
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
const MQTT_URL = process.env.MQTT_URL;
const MQTT_DISCOVERY_TOPIC = process.env.MQTT_DISCOVERY_TOPIC ?? 'automatrix/discovery/+/+';
const PWA_DIST_DIR = process.env.PWA_DIST_DIR ?? join(process.cwd(), '..', 'PWA', 'dist');

let authRecord = await loadOrInitAuth(CONFIG_DIR);
configureSessionPersistence(CONFIG_DIR);

function safeBaseUrl(raw: string): string | null {
  if (!raw || raw.length > 256) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:') return null;
  // Avoid SSRF footguns: keep this strictly for LAN/AP use.
  const host = u.hostname.toLowerCase();
  const isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '192.168.4.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.endsWith('.local');
  if (!isLocalHost) return null;
  u.hash = '';
  u.search = '';
  return u.toString().replace(/\/+$/, '');
}

async function fetchJsonWithClose<T>(url: string, timeoutMs = 2500): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        accept: 'application/json',
        connection: 'close',
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function bearer(req: express.Request): string | undefined {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return undefined;
  return h.slice('Bearer '.length).trim();
}

function toSessionState(rec: {
  role: 'user' | 'installer' | 'manufacturer';
  siteId: string;
  locale: string;
  accessMode: 'local' | 'remote';
}): SessionState {
  return {
    role: rec.role,
    siteId: rec.siteId,
    locale: rec.locale,
    authenticated: true,
    accessMode: rec.accessMode,
  };
}

function safeSiteIdParam(raw: string): string | null {
  if (!raw || raw.length > 96) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(raw)) return null;
  return raw;
}

function canAccessSiteJson(
  rec: { role: 'user' | 'installer' | 'manufacturer'; installerId?: string },
  j: Record<string, unknown>,
): boolean {
  if (rec.role === 'manufacturer') return true;
  if (rec.role === 'user') return false;
  if (rec.role === 'installer') {
    if (!rec.installerId) return false;
    const iid = j.installer_id ?? j.installerId;
    if (typeof iid !== 'string' || iid !== rec.installerId) return false;
    return true;
  }
  return false;
}

function listSites(installerId: string | undefined, role: 'user' | 'installer' | 'manufacturer'): unknown[] {
  const out: unknown[] = [];
  if (role === 'user') return out;
  let names: string[];
  try {
    names = readdirSync(SITES_DIR).filter((n) => n.endsWith('.json'));
  } catch {
    return out;
  }
  for (const name of names) {
    const full = join(SITES_DIR, name);
    try {
      const raw = readFileSync(full, 'utf8');
      const j = JSON.parse(raw) as Record<string, unknown>;
      if (role === 'installer') {
        if (!installerId) continue;
        const iid = j.installer_id ?? j.installerId;
        if (typeof iid !== 'string' || iid !== installerId) continue;
      }
      out.push({ siteId: name.replace(/\.json$/i, ''), ...j });
    } catch {
      // skip corrupt
    }
  }
  return out;
}

const app = express();
app.use(express.json({ limit: '512kb' }));
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  }),
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'kc-pvdg-gateway' });
});

/**
 * Board probe proxy.
 * Fixes ESPHome web_server v3 keep-alive stalls for browser clients by proxying with `Connection: close`.
 * Returns BoardWhoami-like object (or null) compatible with PWA `probeBoard()`.
 */
app.get('/api/board/probe', async (req, res) => {
  const baseUrl = safeBaseUrl(String(req.query.baseUrl ?? ''));
  if (!baseUrl) {
    res.status(400).json({ error: 'invalid baseUrl' });
    return;
  }

  type BoardWhoami = {
    deviceName: string;
    controllerId?: string;
    mac?: string;
    ip?: string;
    fwVersion?: string;
    webUiUrl?: string;
    capabilities?: Record<string, unknown>;
  };

  type EspHomeJson = {
    name?: string;
    mac_address?: string;
    esphome_version?: string;
    friendly_name?: string;
  };

  const whoami = await fetchJsonWithClose<BoardWhoami>(`${baseUrl}/whoami`, 2200);
  if (whoami?.deviceName) {
    res.json({ ok: true, whoami });
    return;
  }

  const esphome = await fetchJsonWithClose<EspHomeJson>(`${baseUrl}/json`, 2200);
  if (esphome?.name || esphome?.friendly_name) {
    res.json({
      ok: true,
      whoami: {
        deviceName: String(esphome.name ?? esphome.friendly_name ?? 'pv-dg-controller'),
        mac: esphome.mac_address,
        fwVersion: esphome.esphome_version,
        webUiUrl: `${baseUrl}/`,
        capabilities: { esphomeWebServer: true },
      } satisfies BoardWhoami,
    });
    return;
  }

  const [controllerId, fwVersion, mac] = await Promise.all([
    fetchJsonWithClose<{ state?: string }>(`${baseUrl}/text_sensor/Controller%20ID`, 2200),
    fetchJsonWithClose<{ state?: string }>(`${baseUrl}/text_sensor/Firmware%20Version`, 2200),
    fetchJsonWithClose<{ state?: string }>(`${baseUrl}/text_sensor/MAC%20Address`, 2200),
  ]);
  if (controllerId?.state) {
    res.json({
      ok: true,
      whoami: {
        deviceName: controllerId.state,
        controllerId: controllerId.state,
        fwVersion: fwVersion?.state,
        mac: mac?.state,
        webUiUrl: `${baseUrl}/`,
        capabilities: { esphomeEntityEndpoints: true },
      } satisfies BoardWhoami,
    });
    return;
  }

  res.json({ ok: false, whoami: null });
});

/**
 * LAN scan helper (gateway-side).
 * The browser cannot scan subnets; the gateway can probe candidate LAN IPs and return the first hit.
 *
 * Query:
 * - subnet: "192.168.0" (defaults to 192.168.0)
 * - hosts: "100,111,1,10,50,200" (optional)
 */
app.get('/api/board/scan', async (req, res) => {
  const subnetRaw = String(req.query.subnet ?? '192.168.0').trim();
  const subnet = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(subnetRaw) ? subnetRaw : '192.168.0';
  const hostsRaw = String(req.query.hosts ?? '').trim();
  const hosts = (hostsRaw ? hostsRaw.split(',') : ['100', '111', '1', '10', '50', '200'])
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 254);

  const tried: string[] = [];
  for (const h of hosts) {
    const baseUrl = `http://${subnet}.${h}`;
    const safe = safeBaseUrl(baseUrl);
    if (!safe) continue;
    tried.push(`${subnet}.${h}`);
    // Reuse the probe endpoint logic via direct calls.
    const whoami = await fetchJsonWithClose<{ deviceName?: string }>(`${safe}/whoami`, 1200);
    if (whoami?.deviceName) {
      res.json({ ok: true, baseUrl: safe, tried });
      return;
    }
    const esphome = await fetchJsonWithClose<{ name?: string; friendly_name?: string }>(`${safe}/json`, 1200);
    if (esphome?.name || esphome?.friendly_name) {
      res.json({ ok: true, baseUrl: safe, tried });
      return;
    }
  }

  res.json({ ok: false, baseUrl: null, tried });
});

app.post('/api/auth/login', async (req, res) => {
  const body = req.body as {
    channel?: LoginChannel;
    password?: string;
    siteId?: string;
    locale?: string;
    installerId?: string;
  };
  const channel = body.channel;
  const password = body.password ?? '';
  if (!channel || !password) {
    res.status(400).json({ error: 'channel and password required' });
    return;
  }
  const { ok, usedOverride } = await verifyLogin(authRecord, channel, password);
  if (!ok) {
    appendAuditLine(CONFIG_DIR, {
      type: 'login.fail',
      channel,
      siteId: body.siteId ?? null,
      ts: new Date().toISOString(),
      ip: req.ip,
    });
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }
  const siteId = typeof body.siteId === 'string' && body.siteId ? body.siteId : 'site-001';
  const locale = typeof body.locale === 'string' && body.locale ? body.locale : 'en';
  const installerId =
    channel === 'installer' && typeof body.installerId === 'string'
      ? body.installerId
      : undefined;

  const token = createSession({
    role: channel,
    siteId,
    locale,
    accessMode: 'remote',
    installerId,
  });

  if (usedOverride) {
    appendAuditLine(CONFIG_DIR, {
      type: 'login.override',
      roleChannel: channel,
      siteId,
      ts: new Date().toISOString(),
      ip: req.ip,
    });
  }
  appendAuditLine(CONFIG_DIR, {
    type: 'login.success',
    channel,
    siteId,
    usedOverride,
    ts: new Date().toISOString(),
    ip: req.ip,
  });

  res.json({
    token,
    session: toSessionState({
      role: channel,
      siteId,
      locale,
      accessMode: 'remote',
    }),
    installerId: installerId ?? null,
  });
});

app.post('/api/auth/password', async (req, res) => {
  const token = bearer(req);
  const rec = getSession(token);
  if (!rec) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const body = req.body as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword ?? '';
  const newPassword = body.newPassword ?? '';
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'newPassword must be at least 8 characters' });
    return;
  }
  const result = await changeOwnPassword(authRecord, rec.role, currentPassword, newPassword);
  if (!result.ok) {
    appendAuditLine(CONFIG_DIR, {
      type: 'password.change.fail',
      role: rec.role,
      reason: result.reason,
      ts: new Date().toISOString(),
      ip: req.ip,
    });
    res.status(403).json({ error: result.reason });
    return;
  }
  authRecord = result.record;
  saveAuth(CONFIG_DIR, authRecord);
  appendAuditLine(CONFIG_DIR, {
    type: 'password.change.success',
    role: rec.role,
    ts: new Date().toISOString(),
    ip: req.ip,
  });
  res.json({ ok: true });
});

/** Manufacturer only: reset any credential slot (user / installer / support_override / manufacturer). */
app.post('/api/auth/admin/reset-password', async (req, res) => {
  const token = bearer(req);
  const rec = getSession(token);
  if (!rec || rec.role !== 'manufacturer') {
    res.status(403).json({ error: 'manufacturer role required' });
    return;
  }
  const body = req.body as { target?: CredentialSlot; newPassword?: string };
  const target = body.target;
  const newPassword = body.newPassword ?? '';
  const allowed: CredentialSlot[] = ['user', 'installer', 'support_override', 'manufacturer'];
  if (!target || !allowed.includes(target)) {
    res.status(400).json({ error: 'invalid target' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'newPassword must be at least 8 characters' });
    return;
  }
  authRecord = await setSlotPasswordPlain(authRecord, target, newPassword);
  saveAuth(CONFIG_DIR, authRecord);
  appendAuditLine(CONFIG_DIR, {
    type: 'password.admin_reset',
    target,
    actor: 'manufacturer',
    siteId: rec.siteId,
    ts: new Date().toISOString(),
    ip: req.ip,
  });
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  const token = bearer(req) ?? (req.body as { token?: string })?.token;
  deleteSession(token);
  res.json({ ok: true });
});

app.get('/api/session', (req, res) => {
  const token = bearer(req);
  const rec = getSession(token);
  if (!rec) {
    res.json({
      role: 'user',
      siteId: 'site-001',
      locale: 'en',
      authenticated: false,
      accessMode: 'remote',
    } satisfies SessionState);
    return;
  }
  res.json(toSessionState(rec));
});

app.get('/api/sites', (req, res) => {
  const token = bearer(req);
  const rec = getSession(token);
  if (!rec?.role) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const sites = listSites(rec.installerId, rec.role);
  res.json({ sites });
});

/** Single site JSON (discovery + optional `pwaSiteConfig`). Installer scope enforced. */
app.get('/api/sites/:siteId', (req, res) => {
  const token = bearer(req);
  const rec = getSession(token);
  if (!rec?.role) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (rec.role === 'user') {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const siteId = safeSiteIdParam(req.params.siteId ?? '');
  if (!siteId) {
    res.status(400).json({ error: 'invalid siteId' });
    return;
  }
  const full = join(SITES_DIR, `${siteId}.json`);
  if (!existsSync(full)) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
  } catch {
    res.status(500).json({ error: 'corrupt site file' });
    return;
  }
  if (!canAccessSiteJson(rec, j)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  res.json({ siteId, ...j });
});

/**
 * Merge `pwaSiteConfig` into `sites/<siteId>.json` (creates file if allowed).
 * Preserves MQTT discovery fields; commissioning blob is under `pwaSiteConfig`.
 */
app.put('/api/sites/:siteId', (req, res) => {
  const token = bearer(req);
  const rec = getSession(token);
  if (!rec?.role) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (rec.role === 'user') {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const siteId = safeSiteIdParam(req.params.siteId ?? '');
  if (!siteId) {
    res.status(400).json({ error: 'invalid siteId' });
    return;
  }
  const body = req.body as { pwaSiteConfig?: unknown };
  if (
    body?.pwaSiteConfig === undefined ||
    typeof body.pwaSiteConfig !== 'object' ||
    body.pwaSiteConfig === null ||
    Array.isArray(body.pwaSiteConfig)
  ) {
    res.status(400).json({ error: 'pwaSiteConfig object required' });
    return;
  }
  const full = join(SITES_DIR, `${siteId}.json`);
  let base: Record<string, unknown> = {};
  if (existsSync(full)) {
    try {
      base = JSON.parse(readFileSync(full, 'utf8')) as Record<string, unknown>;
    } catch {
      res.status(500).json({ error: 'corrupt site file' });
      return;
    }
    if (!canAccessSiteJson(rec, base)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
  } else if (rec.role === 'installer') {
    if (!rec.installerId) {
      res.status(403).json({ error: 'installerId required on session' });
      return;
    }
    base.installer_id = rec.installerId;
  }
  const next = { ...base, pwaSiteConfig: body.pwaSiteConfig };
  writeJsonAtomic(full, next);
  appendAuditLine(CONFIG_DIR, {
    type: 'site.config.write',
    siteId,
    role: rec.role,
    ts: new Date().toISOString(),
    ip: req.ip,
  });
  res.json({ ok: true, siteId });
});

startMqttDiscovery({
  url: MQTT_URL,
  topic: MQTT_DISCOVERY_TOPIC,
  sitesDir: SITES_DIR,
  configDir: CONFIG_DIR,
});

// Optional: serve the built PWA from the gateway for same-origin /api access.
// This makes commissioning/discovery reliable without configuring CORS/proxies.
if (existsSync(join(PWA_DIST_DIR, 'index.html'))) {
  app.use(express.static(PWA_DIST_DIR));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(join(PWA_DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[gateway] listening on http://127.0.0.1:${PORT}`);
  console.log(`[gateway] CONFIG_DIR=${CONFIG_DIR}`);
  if (existsSync(join(PWA_DIST_DIR, 'index.html'))) {
    console.log(`[gateway] serving PWA from ${PWA_DIST_DIR}`);
  }
});
