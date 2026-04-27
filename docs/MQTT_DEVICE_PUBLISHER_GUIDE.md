# MQTT device publisher guide (KC_PV_DG)

This guide defines the **MQTT discovery publish contract** that the KC_PV_DG gateway consumes.

It is designed to be safe on a shared VPS broker (no interference with other apps) by using a dedicated namespace:

- `kc_pv_dg/discovery/...`

## 1) Topic format

Publish discovery messages to:

- `kc_pv_dg/discovery/<installerId>/<siteId>`

Examples:
- `kc_pv_dg/discovery/inst-001/site-001`
- `kc_pv_dg/discovery/inst-rao/demo-site-a`

## 2) Payload format (JSON)

Payload must be **valid JSON**.

Recommended keys:
- `siteId` (string): the site id. If missing, the gateway will fall back to the last topic segment.
- `installer_id` (string): installer scope (optional but recommended).
- `controllerIp` (string): controller LAN IP (optional).
- `controllerId` (string): controller ID / name (optional).
- `fwVersion` (string): firmware version string (optional).
- `devices` (array): optional list of devices and basic metadata.

Example payload:

```json
{
  "siteId": "site-001",
  "installer_id": "inst-001",
  "controllerIp": "192.168.0.101",
  "controllerId": "pv-dg-controller",
  "fwVersion": "2026.04.27",
  "devices": [
    { "kind": "meter", "id": "grid_1", "driverId": "em500_grid", "unitId": 1 },
    { "kind": "inverter", "id": "inv_1", "driverId": "sungrow", "unitId": 10 }
  ]
}
```

## 3) Gateway behavior (what happens after publish)

When the gateway receives a message on the subscribed topic:
- It parses the JSON.
- It determines `siteId` from payload (`siteId`/`site_id`) or falls back to the last topic segment.
- It writes to: `sites/<siteId>.json` under the gateway `CONFIG_DIR` (Docker volume path: `/data/config/sites/`).
- It adds metadata fields:
  - `_mqttTopic`
  - `_receivedAt`

## 4) VPS broker publishing example (safe)

From the VPS shell:

```bash
mosquitto_pub -h 127.0.0.1 \
  -t kc_pv_dg/discovery/inst-001/site-001 \
  -m '{"siteId":"site-001","installer_id":"inst-001","controllerIp":"192.168.0.101"}'
```

## 5) Edge device publisher example (Node.js)

```js
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://<vps-ip>:1883');
client.on('connect', () => {
  const topic = 'kc_pv_dg/discovery/inst-001/site-001';
  const payload = JSON.stringify({
    siteId: 'site-001',
    installer_id: 'inst-001',
    controllerIp: '192.168.0.101',
  });
  client.publish(topic, payload, { qos: 0, retain: false }, () => client.end());
});
```

## 6) Notes & safety

- On the current VPS Mosquitto setup, port `1883` is public and `allow_anonymous true`. Treat it as **untrusted** until we add a dedicated secured listener/credentials for KC_PV_DG.
- Do not publish into other apps’ namespaces.
- Keep payload size small (discovery snapshots, not time-series telemetry).

### Retain policy (recommended)

- For discovery snapshots, set **`retain=true`** so the latest state is available immediately after broker or gateway reconnect.
- Publish again whenever something changes (controller IP, firmware, device inventory).

Example (retained):

```bash
mosquitto_pub -h 127.0.0.1 \
  -t kc_pv_dg/discovery/inst-001/site-001 \
  -m '{"siteId":"site-001","installer_id":"inst-001","controllerIp":"192.168.0.101"}' \
  -r
```

