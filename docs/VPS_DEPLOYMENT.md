# VPS deployment (Docker Compose)

This project is intended to be deployed on a Linux VPS using **Docker Compose**, without interfering with other apps already running on the server.

## What runs on the VPS

- **Gateway**: Node/Express API (`/api/*`) with persistent storage under `CONFIG_DIR` (in Docker: a volume).
- **PWA**: static web app served by nginx.

> LAN-only commissioning: the VPS gateway **must not** scan customer LANs. LAN scan/probe endpoints are disabled in public mode (see `.env.example`).

## Prerequisites on the VPS

- Docker + Docker Compose plugin installed.
- A directory on the VPS for this app, e.g. `/opt/kc_pv_dg/`.
- (Recommended) a reverse proxy that already hosts your other apps (nginx/Traefik/Caddy). We can later plug this stack behind it.

## First deploy

1. SSH into the VPS:

```bash
ssh vps-hostinger
```

2. Clone/pull code (or upload a release bundle):

```bash
mkdir -p /opt/kc_pv_dg
cd /opt/kc_pv_dg
git clone <your-repo-url> .
git checkout feature/driver-library-v1
```

3. Create `.env`:

```bash
cp .env.example .env
nano .env
```

Minimum recommended fields:
- `CORS_ORIGIN`: your final PWA origin(s), e.g. `https://pv-dg.example.com`
- `KC_PVDG_PUBLIC_MODE=1`
- `MQTT_URL=mqtt://host.docker.internal:1883` (optional; uses the VPS Mosquitto broker from inside Docker)
- `MQTT_DISCOVERY_TOPIC=kc_pv_dg/discovery/+/+` (recommended dedicated namespace)
- strong `INITIAL_*_PASSWORD` values (first boot only; remove after initialization)

4. Build and start:

```bash
docker compose up -d --build
```

5. Smoke tests:

- Gateway health:
  - `GET http://<vps-host>:8788/api/health`
- PWA:
  - `http://<vps-host>:8080/`

## Data persistence

Gateway persistent data is stored in the compose volume:
- `gateway_data` → `/data` inside the container
- Gateway config path in container: `/data/config`

This includes:
- `auth.json`
- `audit.log`
- `sessions.json`
- `sites/*.json`
- driver library JSON files (under the gateway config dir)

## Backup & restore

### Backup

```bash
docker compose ps
docker run --rm -v kc_pv_dg_gateway_data:/data -v "$PWD":/backup alpine \
  sh -c "cd /data && tar -czf /backup/gateway_data_$(date +%F).tgz ."
```

Copy the tarball off the VPS (recommended).

### Restore

1. Stop stack:

```bash
docker compose down
```

2. Restore into the volume:

```bash
docker run --rm -v kc_pv_dg_gateway_data:/data -v "$PWD":/backup alpine \
  sh -c "rm -rf /data/* && tar -xzf /backup/<backup-file>.tgz -C /data"
```

3. Start:

```bash
docker compose up -d
```

## Upgrades & rollback

### Upgrade

```bash
git pull
docker compose up -d --build
```

### Rollback

```bash
git checkout <old-commit-or-tag>
docker compose up -d --build
```

## Security notes (must-read)

- In production, set `KC_PVDG_PUBLIC_MODE=1` so LAN scan/probe endpoints are disabled.
- Set `CORS_ORIGIN` to your real origin(s). Do **not** leave it empty or `*`.
- Rotate initial passwords after first boot (remove `INITIAL_*` values from `.env`).

## MQTT notes (do not disturb existing broker)

Your VPS already runs a public Mosquitto broker on `0.0.0.0:1883`. Other apps are connected to it.

To avoid interfering:
- Do **not** restart or reconfigure Mosquitto as part of this deployment.
- Use a dedicated topic namespace (default in `.env.example`): `kc_pv_dg/discovery/+/+`
- Start with **subscribe-only** discovery ingestion (what the gateway does today).

### Discovery topic format (recommended)

- Topic: `kc_pv_dg/discovery/<installerId>/<siteId>`
  - Example: `kc_pv_dg/discovery/inst-001/site-001`
- Payload: JSON object. Recommended keys:
  - `siteId`: string (if missing, gateway falls back to `<siteId>` from topic)
  - `installer_id`: string (optional)
  - any extra discovery fields (device inventory, controller IPs, etc.)

### Publish example (safe namespace)

```bash
mosquitto_pub -h 127.0.0.1 \
  -t kc_pv_dg/discovery/inst-001/site-001 \
  -m '{"siteId":"site-001","installer_id":"inst-001","controllerIp":"192.168.0.101"}'
```

