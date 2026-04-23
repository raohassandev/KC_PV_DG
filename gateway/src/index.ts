import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import cors from 'cors';
import express from 'express';
import type { SessionState } from '../../dynamic_zero_export/pwa/contracts/session.js';
import { appendAuditLine } from './atomicFile.js';
import {
  changeOwnPassword,
  loadOrInitAuth,
  saveAuth,
  verifyLogin,
  type LoginChannel,
} from './authStore.js';
import { startMqttDiscovery } from './mqttDiscovery.js';
import { createSession, deleteSession, getSession } from './sessions.js';

const PORT = Number(process.env.PORT ?? 8788);
const CONFIG_DIR = process.env.CONFIG_DIR ?? join(process.cwd(), 'data', 'config');
const SITES_DIR = join(CONFIG_DIR, 'sites');
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
const MQTT_URL = process.env.MQTT_URL;
const MQTT_DISCOVERY_TOPIC = process.env.MQTT_DISCOVERY_TOPIC ?? 'automatrix/discovery/+/+';

let authRecord = await loadOrInitAuth(CONFIG_DIR);

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

startMqttDiscovery({
  url: MQTT_URL,
  topic: MQTT_DISCOVERY_TOPIC,
  sitesDir: SITES_DIR,
  configDir: CONFIG_DIR,
});

app.listen(PORT, () => {
  console.log(`[gateway] listening on http://127.0.0.1:${PORT}`);
  console.log(`[gateway] CONFIG_DIR=${CONFIG_DIR}`);
});
