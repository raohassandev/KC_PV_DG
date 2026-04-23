# KC_PV_DG — agent handoff, history, and status

**Single source of truth for future agents:** what exists, how auth works, what shipped on branch `dynamic-Zero-export`, and what remains **hardware-only**. Domain checklists (`implementation_checklist.md`, `Plan_updated.md`) stay as engineering detail; this file is the **narrative + inventory + roadmap**.

---

## Plan status (software)

All **gateway + PWA + CI** milestones described in prior iterations of this document are **implemented**: auth, fleet site JSON, Playwright (including gateway stack), password UX, hover help, typecheck, commissioning overlay, **disk-backed sessions**. The only open row in the matrix below is **ESP32 / board automation**, which requires field hardware and firmware packaging — out of scope for this repo’s Node/React track.

---

## 1. Product snapshot

**KC_PV_DG** is a PV-DG (solar / diesel-grid) commissioning stack:

| Area | Path | Role |
|------|------|------|
| **PWA** | `PWA/` | React commissioning UI: site profile, topology, slots, YAML bundle, Dynamic Zero Export feature area, gateway-backed auth when configured |
| **Gateway** | `gateway/` | Node (Express): bcrypt auth, **persisted** sessions, MQTT discovery → `sites/<id>.json`, audit log, fleet site APIs, manufacturer admin password reset |
| **Dynamic Zero Export** | `dynamic_zero_export/` | Types, API simulator, policy/runtime shared with firmware direction |
| **Board / ESPHome** | `Modular_Yaml/`, etc. | Field YAML; **no automatic** push/pull to gateway `pwaSiteConfig` yet |

Root **`package.json`** scripts: `verify` (full CI gate), `dev` (unit tests + PWA build + `dev:pwa`), `test:e2e:pwa`, `test:e2e:gateway:pwa`.

---

## 2. Chronological implementation history (high level)

1. **PWA commissioning shell** — Tabs: product, dashboard, site, topology, slots, templates, validation, engineer, YAML. `SiteConfig` in `PWA/src/siteProfileSchema.ts` / `siteTemplates.ts`, bundle in `siteBundleGenerator.ts`, policy in `policySchema.ts`.
2. **Role-based tab access** — `PWA/src/auth/tabAccess.ts`, `useAuth`, `LoginScreen`; roles align with `dynamic_zero_export` PWA session contracts.
3. **Gateway package** — Express app `gateway/src/index.ts`: health, login/logout/session, password change, atomic `auth.json`, optional MQTT discovery (`mqttDiscovery.ts`), `GET /api/sites` list with installer filtering.
4. **PWA ↔ gateway auth** — `VITE_GATEWAY_URL` enables real login; `AuthContext` stores bearer token; local dev uses plaintext compare to dev strings when gateway URL unset **and** `viteIsDev()` from `viteMetaEnv.ts`.
5. **Change password** — `POST /api/auth/password` + `ChangePasswordDialog` (gateway sessions only). **Manufacturer admin reset** — `POST /api/auth/admin/reset-password` + `AdminResetPasswordDialog` (manufacturer only).
6. **Site commissioning sync** — `pwaSiteConfig` merged into `sites/<siteId>.json`; `GET/PUT /api/sites/:siteId`; PWA Site Setup panel (installer/manufacturer + remote token) with load/save; `mergePwaSiteConfigFromGatewayPayload` in `PWA/src/auth/gatewaySiteConfig.ts`.
7. **Playwright** — Default 18 tests (sim + Vite, no gateway). **`E2E_WITH_GATEWAY=1`**: dual webServer + `06-gateway-site-sync.spec.ts` (manufacturer round-trip, installer + `installerId`, commissioning tab shows gateway `siteName`). CI installs `gateway/` deps and `verify` runs both E2E suites.
8. **Credentials docs** — `CREDENTIALS.local.example` (tracked), `CREDENTIALS.local.md` (gitignored copy). No default installer ID in code; fleet label is user-chosen at login.
9. **Root `npm run dev`** — `test:dzx` + `test:pwa` + `build:pwa` + `dev:pwa`.
10. **Local dev “Change password” UX** — `LocalDevPasswordHintDialog.tsx` when no gateway.
11. **Field help on hover** — `HelpHint.tsx` on form fields in `App.tsx`.
12. **Gateway `tsc`** — `session.ts` imports `../roles.js`; **`npm run check:gateway`** in `verify`.
13. **Node-safe Vite env** — `viteMetaEnv.ts`; API sim tests use **port 0**.
14. **Session disk persistence** — `gateway/src/sessions.ts`: `configureSessionPersistence(CONFIG_DIR)`, `sessions.json` (`{ version: 1, sessions }`), hydrate on boot, atomic rewrite on login/logout.
15. **Commissioning + gateway** — `CommissioningPage` fetches `GET /api/sites/:session.siteId` when `siteGatewaySyncAvailable`; subtitle includes **`gateway pwaSiteConfig: &lt;name&gt;`** when stored; fleet card still explains Site Setup sync.
16. **Login Site ID** — PWA login exposes **Site ID (fleet)** (gateway or dev); `README.md` documents PWA-specific flows end-to-end.

---

## 3. Auth and password update (current behavior)

| Mode | Login | Change password button | Behavior |
|------|-------|---------------------------|----------|
| **Gateway** (`VITE_GATEWAY_URL` set) | API | Shown | `ChangePasswordDialog` → `POST /api/auth/password` (min 8 chars), then logout to re-login |
| **Local dev** (no gateway URL, `DEV`) | In-browser dev passwords | Shown | `LocalDevPasswordHintDialog` |
| **Production build, no gateway** | Effectively blocked at login | Hidden | No dev flag |

**Manufacturer:** **Reset accounts** when gateway + manufacturer role.

**Reference:** `CREDENTIALS.local.example`.

---

## 4. Gateway API summary (implemented)

- `GET /api/health`
- `POST /api/auth/login` — `channel`, `password`, optional `siteId`, `installerId` (installer channel)
- `POST /api/auth/logout`, `GET /api/session`
- `POST /api/auth/password`, `POST /api/auth/admin/reset-password`
- `GET /api/sites`, `GET /api/sites/:siteId`, `PUT /api/sites/:siteId` — body `{ pwaSiteConfig }` for PUT

**Storage (`CONFIG_DIR`):** `auth.json`, `audit.log`, **`sessions.json`**, `sites/*.json`.

---

## 5. PWA integration points

- **`PWA/src/auth/AuthContext.tsx`** — session, `fetchGateway`, `siteGatewaySyncAvailable`, login, passwords
- **`PWA/src/App.tsx`** — shell, gateway site sync on Site tab
- **`PWA/src/features/dynamic-zero-export/pages/CommissioningPage.tsx`** — DZX API + gateway `pwaSiteConfig` subtitle overlay
- **`PWA/src/auth/LoginScreen.tsx`** — **Site ID (fleet)** on login when gateway or dev build; aligns session with `sites/<id>.json` for Site Setup + commissioning
- **`PWA/playwright.config.ts`**, **`PWA/scripts/e2e-gateway-server.mjs`** — gateway E2E
- **`PWA/src/components/HelpHint.tsx`**

---

## 6. Status matrix

| Item | Status | Notes |
|------|--------|------|
| PWA commissioning UI + YAML bundle | **Done** | |
| Tab RBAC | **Done** | |
| Gateway auth + sessions | **Done** | **`sessions.json`** survives gateway restart |
| MQTT discovery → site JSON | **Done** | Needs `MQTT_URL` |
| Password change + local hint | **Done** | |
| Manufacturer admin reset | **Done** | |
| Site `pwaSiteConfig` sync | **Done** | |
| Commissioning UI + gateway overlay | **Done** | Subtitle + fleet card; uses **`session.siteId`** for GET |
| Playwright + gateway E2E | **Done** | 18 + 3 tests |
| CI / verify | **Done** | `check:gateway`, dual E2E |
| ESP32 / board live sync with `SiteConfig` | **Not done** | Hardware / ESPHome track; see `implementation_checklist.md` |

---

## 7. Recommended next work (hardware & scale)

1. **Board / fleet continuity** — Push/pull between live board (`boardIp`), ESPHome packages, and gateway `sites/*.json` / `pwaSiteConfig` (field + firmware work).
2. **Session store at scale** — If single-file `sessions.json` becomes a bottleneck, move to Redis or sharded store; add TTL eviction for stale tokens.

---

## 8. Commands cheat sheet

```bash
npm run verify
npm run dev
cd PWA && CI=1 npm run test:e2e
cd PWA && CI=1 npm run test:e2e:gateway
```

---

## 9. Related docs (not superseded)

- `docs/implementation_checklist.md` — board + schema migration
- `docs/Plan_updated.md` — product vision
- `docs/dynamic_zero_export_commissioning.md` — DZX narrative
- `gateway/README.md` — env vars, HTTP, storage

**Last updated:** 2026-04-24 — software plan items through session persistence + commissioning gateway overlay are **complete**; matrix “not done” is **board-only**.
