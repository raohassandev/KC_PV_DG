import { existsSync, readdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
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
import { deleteDriver, getDriver, listDrivers, saveDriver, type DriverDefinition } from './driverStore.js';

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

function ipv4ToInt(ip: string): number | null {
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map((s) => Number(s));
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function intToIpv4(n: number): string {
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}

function maskToPrefix(mask: string): number | null {
  const mi = ipv4ToInt(mask);
  if (mi === null) return null;
  // Count leading ones.
  let prefix = 0;
  for (let bit = 31; bit >= 0; bit--) {
    if (((mi >>> bit) & 1) === 1) prefix++;
    else break;
  }
  // Validate contiguous ones.
  const expected = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  if (expected !== mi) return null;
  return prefix;
}

function listLocalIpv4Cidrs(): Array<{ iface: string; ip: string; cidr: string; prefix: number }> {
  const nets = os.networkInterfaces();
  const out: Array<{ iface: string; ip: string; cidr: string; prefix: number }> = [];
  for (const [iface, addrs] of Object.entries(nets)) {
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4') continue;
      if (a.internal) continue;
      const prefix = typeof a.netmask === 'string' ? maskToPrefix(a.netmask) : null;
      if (!prefix || prefix < 16 || prefix > 30) continue;
      out.push({ iface, ip: a.address, cidr: `${a.address}/${prefix}`, prefix });
    }
  }
  return out;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  const a = (n >>> 24) & 255;
  const b = (n >>> 16) & 255;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  return false;
}

function buildScanTargetsFromCidrs(
  cidrs: Array<{ iface: string; ip: string; prefix: number }>,
): string[] {
  const targets = new Set<string>();
  for (const c of cidrs) {
    if (!isPrivateIpv4(c.ip)) continue;
    const ipInt = ipv4ToInt(c.ip);
    if (ipInt === null) continue;
    const mask = (0xffffffff << (32 - c.prefix)) >>> 0;
    const net = (ipInt & mask) >>> 0;
    const hostCount = 1 << (32 - c.prefix);
    // Scan up to /24 fully; for larger networks, scan a focused slice.
    const maxHostsToScan = c.prefix >= 24 ? hostCount : 512;
    const start = net + 1;
    const end = net + hostCount - 2;
    let added = 0;
    for (let addr = start; addr <= end && added < maxHostsToScan; addr++) {
      const hostOctet = addr & 255;
      // Skip common non-device addresses in many DHCP pools? Keep it simple; just skip .0/.255.
      if (hostOctet === 0 || hostOctet === 255) continue;
      targets.add(intToIpv4(addr >>> 0));
      added++;
    }
  }

  // Always include ESPHome AP default.
  targets.add('192.168.4.1');

  return Array.from(targets);
}

async function probeIpForController(ip: string): Promise<boolean> {
  const baseUrl = safeBaseUrl(`http://${ip}`);
  if (!baseUrl) return false;

  // Fast, reliable identity endpoint in this firmware.
  const controllerId = await fetchJsonWithClose<{ state?: string }>(
    `${baseUrl}/text_sensor/Controller%20ID`,
    900,
  );
  if (controllerId?.state) return true;

  // Future contract.
  const whoami = await fetchJsonWithClose<{ deviceName?: string }>(`${baseUrl}/whoami`, 900);
  if (whoami?.deviceName) return true;

  // /json is last resort (can stall/empty reply on some builds).
  const esphome = await fetchJsonWithClose<{ name?: string; friendly_name?: string }>(
    `${baseUrl}/json`,
    900,
  );
  if (esphome?.name || esphome?.friendly_name) return true;

  return false;
}

async function findFirstReachableController(
  ips: string[],
  concurrency = 32,
): Promise<{ ip: string } | null> {
  let idx = 0;
  let found: { ip: string } | null = null;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (found === null) {
      const i = idx++;
      if (i >= ips.length) return;
      const ip = ips[i]!;
      const ok = await probeIpForController(ip);
      if (ok && found === null) found = { ip };
    }
  });

  await Promise.all(workers);
  return found;
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

function pickControllerRuntimeMode(
  j: Record<string, unknown>,
): 'sync_controller' | 'dzx_virtual_meter' | undefined {
  const top = j.controllerRuntimeMode;
  if (top === 'sync_controller' || top === 'dzx_virtual_meter') return top;
  const pwa = j.pwaSiteConfig;
  if (pwa && typeof pwa === 'object' && !Array.isArray(pwa)) {
    const m = (pwa as Record<string, unknown>).controllerRuntimeMode;
    if (m === 'sync_controller' || m === 'dzx_virtual_meter') return m;
  }
  return undefined;
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
      const mode = pickControllerRuntimeMode(j);
      out.push({
        siteId: name.replace(/\.json$/i, ''),
        ...j,
        ...(mode ? { controllerRuntimeMode: mode } : {}),
      });
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

// Driver library (manufacturer-managed).
app.get('/api/drivers', (req, res) => {
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
  res.json({ drivers: listDrivers(CONFIG_DIR) });
});

app.get('/api/drivers/:driverId', (req, res) => {
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
  const driverId = String(req.params.driverId ?? '');
  const d = getDriver(CONFIG_DIR, driverId);
  if (!d) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ driver: d });
});

app.put('/api/drivers/:driverId', (req, res) => {
  const token = bearer(req);
  const rec = getSession(token);
  if (!rec?.role) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (rec.role !== 'manufacturer') {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const driverId = String(req.params.driverId ?? '');
  const body = req.body as { driver?: DriverDefinition };
  if (!body?.driver) {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }
  const saved = saveDriver(CONFIG_DIR, driverId, body.driver);
  if (!saved) {
    res.status(400).json({ error: 'invalid_driver_id' });
    return;
  }
  appendAuditLine(CONFIG_DIR, {
    type: 'driver.save',
    driverId,
    role: rec.role,
    ts: new Date().toISOString(),
    ip: req.ip,
  });
  res.json({ ok: true, driver: saved });
});

app.delete('/api/drivers/:driverId', (req, res) => {
  const token = bearer(req);
  const rec = getSession(token);
  if (!rec?.role) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (rec.role !== 'manufacturer') {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const driverId = String(req.params.driverId ?? '');
  const ok = deleteDriver(CONFIG_DIR, driverId);
  if (!ok) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  appendAuditLine(CONFIG_DIR, {
    type: 'driver.delete',
    driverId,
    role: rec.role,
    ts: new Date().toISOString(),
    ip: req.ip,
  });
  res.json({ ok: true });
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
  // Back-compat mode: allow scanning a specific /24 with a host list.
  const subnetRaw = String(req.query.subnet ?? '').trim();
  const hostsRaw = String(req.query.hosts ?? '').trim();
  if (subnetRaw && hostsRaw) {
    const subnet = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(subnetRaw) ? subnetRaw : null;
    if (!subnet) {
      res.status(400).json({ ok: false, baseUrl: null, tried: [], error: 'invalid subnet' });
      return;
    }
    const hosts = hostsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 254);

    const tried: string[] = [];
    for (const h of hosts) {
      const ip = `${subnet}.${h}`;
      tried.push(ip);
      const ok = await probeIpForController(ip);
      if (ok) {
        const safe = safeBaseUrl(`http://${ip}`);
        res.json({ ok: true, baseUrl: safe, tried });
        return;
      }
    }
    res.json({ ok: false, baseUrl: null, tried });
    return;
  }

  // Auto mode: discover local private subnets from the gateway host and scan them.
  const ifaces = listLocalIpv4Cidrs();
  const cidrs = ifaces.map((x) => ({ iface: x.iface, ip: x.ip, prefix: x.prefix }));
  const ips = buildScanTargetsFromCidrs(cidrs);

  const startTs = Date.now();
  const found = await findFirstReachableController(ips, 32);
  const elapsedMs = Date.now() - startTs;

  if (found) {
    const safe = safeBaseUrl(`http://${found.ip}`);
    res.json({
      ok: true,
      baseUrl: safe,
      tried: [],
      meta: { mode: 'auto', elapsedMs, interfaces: ifaces },
    });
    return;
  }

  res.json({
    ok: false,
    baseUrl: null,
    tried: [],
    meta: { mode: 'auto', elapsedMs, interfaces: ifaces },
  });
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
  const mode = pickControllerRuntimeMode(j);
  res.json({
    siteId,
    ...j,
    ...(mode ? { controllerRuntimeMode: mode } : {}),
  });
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
