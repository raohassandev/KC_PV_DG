import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import mqtt, { type MqttClient } from 'mqtt';
import { appendAuditLine, writeJsonAtomic } from './atomicFile.js';

function topicParts(topic: string): string[] {
  return topic
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeIdFromTopicPart(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s || s.length > 96) return undefined;
  // Keep the same allowed charset as safeSiteIdParam() used for site files.
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return undefined;
  return s;
}

export function startMqttDiscovery(opts: {
  url?: string;
  topic: string;
  sitesDir: string;
  configDir: string;
}): MqttClient | null {
  const url = opts.url?.trim();
  if (!url) {
    console.warn('[gateway] MQTT_URL not set; discovery disabled');
    return null;
  }
  mkdirSync(opts.sitesDir, { recursive: true });
  const client = mqtt.connect(url, { reconnectPeriod: 5000 });

  client.on('connect', () => {
    console.log(`[gateway] MQTT connected, subscribing ${opts.topic}`);
    client.subscribe(opts.topic, (err) => {
      if (err) console.error('[gateway] MQTT subscribe error', err);
    });
  });

  client.on('message', (topic, payload) => {
    try {
      const text = payload.toString('utf8');
      const data = JSON.parse(text) as Record<string, unknown>;

      // Recommended topic format:
      // kc_pv_dg/discovery/<installerId>/<siteId>
      const parts = topicParts(topic);
      const siteFromTopic = safeIdFromTopicPart(parts.at(-1));
      const installerFromTopic = safeIdFromTopicPart(parts.at(-2));

      const siteId =
        (typeof data.siteId === 'string' && data.siteId) ||
        (typeof data.site_id === 'string' && data.site_id) ||
        siteFromTopic ||
        'unknown-site';

      // Normalize installer id when missing (helps installer scoping for site list).
      const normalized =
        typeof (data as any).installer_id === 'string' || typeof (data as any).installerId === 'string'
          ? data
          : installerFromTopic
            ? { ...data, installer_id: installerFromTopic }
            : data;

      const path = join(opts.sitesDir, `${siteId}.json`);
      writeJsonAtomic(path, { ...normalized, _mqttTopic: topic, _receivedAt: new Date().toISOString() });
      appendAuditLine(opts.configDir, {
        type: 'mqtt.discovery',
        siteId,
        topic,
        ts: new Date().toISOString(),
      });
    } catch (e) {
      // Avoid noisy stack traces on public brokers. Log a compact error.
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[gateway] discovery parse error:', msg);
    }
  });

  client.on('error', (e) => console.error('[gateway] MQTT error', e));
  return client;
}
