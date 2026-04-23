# KC PV-DG gateway (VPS)

Node gateway for **fleet auth**, **MQTT discovery**, and **append-only audit** — **no SQL/Mongo**. Configuration lives under `CONFIG_DIR` (default: `./data/config` relative to the process cwd when started from this folder).

## Run

```bash
cd gateway
npm install
npm start
```

Health: `GET http://127.0.0.1:8788/api/health`

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8788` | HTTP listen port |
| `CONFIG_DIR` | `<cwd>/data/config` | `auth.json`, `audit.log`, `sites/` |
| `MQTT_URL` | _(empty)_ | e.g. `mqtt://user:pass@host:1883` |
| `MQTT_DISCOVERY_TOPIC` | `automatrix/discovery/+/+` | Discovery subscription |
| `CORS_ORIGIN` | `*` | Comma-separated origins or `*` |
| `INITIAL_USER_PASSWORD` | `DevUser!1` | Seed on first boot only |
| `INITIAL_INSTALLER_PASSWORD` | `DevInstall!1` | Seed on first boot only |
| `INITIAL_SUPPORT_PASSWORD` | `DevSupport!1` | Support override hash seed |
| `INITIAL_MANUFACTURER_PASSWORD` | `DevMfg!1` | Seed on first boot only |

## API (summary)

- `POST /api/auth/login` — `{ channel, password, siteId?, installerId?, locale? }`
- `POST /api/auth/logout` — `Authorization: Bearer <token>` or `{ token }`
- `GET /api/session` — Bearer
- `POST /api/auth/password` — Bearer + `{ currentPassword, newPassword }` (min 8 chars); updates the **logged-in role’s** bcrypt hash (`user` / `installer` / `manufacturer` only).
- `POST /api/auth/admin/reset-password` — Bearer + **manufacturer** session + `{ target, newPassword }` where `target` is `user` \| `installer` \| `support_override` \| `manufacturer`; writes new bcrypt hash (audited).
- `GET /api/sites` — Bearer; installer list filtered by `installerId` from discovery JSON / login.
- `GET /api/sites/:siteId` — Bearer; **installer** / **manufacturer** only; returns merged JSON (discovery + optional `pwaSiteConfig`).
- `PUT /api/sites/:siteId` — Bearer; same roles; body `{ pwaSiteConfig }` (object); merges into `sites/<siteId>.json` (atomic write, audited). Installer creates new files scoped to their `installer_id`.

## Storage

- `auth.json` — bcrypt hashes; written with **atomic temp + rename**.
- `audit.log` — JSON lines; append + `fsync`.
- `sites/<siteId>.json` — MQTT discovery payload plus optional commissioning blob **`pwaSiteConfig`** (PWA `SiteConfig` JSON) written by the PWA or API.
