import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import mqtt, { type MqttClient } from 'mqtt';
import { appendAuditLine, writeJsonAtomic } from './atomicFile.js';

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
      const siteId =
        (typeof data.siteId === 'string' && data.siteId) ||
        (typeof data.site_id === 'string' && data.site_id) ||
        topic.split('/').pop() ||
        'unknown-site';
      const path = join(opts.sitesDir, `${siteId}.json`);
      writeJsonAtomic(path, { ...data, _mqttTopic: topic, _receivedAt: new Date().toISOString() });
      appendAuditLine(opts.configDir, {
        type: 'mqtt.discovery',
        siteId,
        topic,
        ts: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[gateway] discovery parse error', e);
    }
  });

  client.on('error', (e) => console.error('[gateway] MQTT error', e));
  return client;
}
