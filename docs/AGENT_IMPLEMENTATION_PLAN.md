# KC_PV_DG — agent handoff, history, and status

**Single source of truth for future agents:** what exists, how auth works, what shipped on branch `dynamic-Zero-export`, and what is intentionally not done yet. Domain checklists (`implementation_checklist.md`, `Plan_updated.md`) stay as engineering detail; this file is the **narrative + inventory + next steps**.

---

## 1. Product snapshot

**KC_PV_DG** is a PV-DG (solar / diesel-grid) commissioning stack:

| Area | Path | Role |
|------|------|------|
| **PWA** | `PWA/` | React commissioning UI: site profile, topology, slots, YAML bundle, Dynamic Zero Export feature area, gateway-backed auth when configured |
| **Gateway** | `gateway/` | Node (Express): bcrypt auth, sessions, MQTT discovery → `sites/<id>.json`, audit log, fleet site APIs, manufacturer admin password reset |
| **Dynamic Zero Export** | `dynamic_zero_export/` | Types, API simulator, policy/runtime shared with firmware direction |
| **Board / ESPHome** | `Modular_Yaml/`, etc. | Field YAML; not fully wired to gateway site sync in this phase |

Root **`package.json`** scripts: `verify` (full CI gate), `dev` (unit tests + PWA build + `dev:pwa`), `test:e2e:pwa`, `test:e2e:gateway:pwa`.

---

## 2. Chronological implementation history (high level)

This is a condensed timeline of work that landed in-repo (including prior sessions summarized into the codebase state).

1. **PWA commissioning shell** — Tabs: product, dashboard, site, topology, slots, templates, validation, engineer, YAML. `SiteConfig` in `PWA/src/siteProfileSchema.ts` / `siteTemplates.ts`, bundle in `siteBundleGenerator.ts`, policy in `policySchema.ts`.
2. **Role-based tab access** — `PWA/src/auth/tabAccess.ts`, `useAuth`, `LoginScreen`; roles align with `dynamic_zero_export` PWA session contracts.
3. **Gateway package** — Express app `gateway/src/index.ts`: health, login/logout/session, password change, atomic `auth.json`, optional MQTT discovery (`mqttDiscovery.ts`), `GET /api/sites` list with installer filtering.
4. **PWA ↔ gateway auth** — `VITE_GATEWAY_URL` enables real login; `AuthContext` stores bearer token; local dev uses plaintext compare to dev strings when gateway URL unset **and** `import.meta.env.DEV`.
5. **Change password** — `POST /api/auth/password` + `ChangePasswordDialog` (gateway sessions only). **Manufacturer admin reset** — `POST /api/auth/admin/reset-password` + `AdminResetPasswordDialog` (manufacturer only).
6. **Site commissioning sync** — `pwaSiteConfig` merged into `sites/<siteId>.json`; `GET/PUT /api/sites/:siteId`; PWA Site Setup panel (installer/manufacturer + remote token) with load/save; `mergePwaSiteConfigFromGatewayPayload` in `PWA/src/auth/gatewaySiteConfig.ts`.
7. **Playwright** — Default 18 tests (sim + Vite, no gateway). **`E2E_WITH_GATEWAY=1`**: dual webServer + `06-gateway-site-sync.spec.ts` (manufacturer + **installer + `installerId`** round-trips). CI installs `gateway/` deps and `verify` runs both E2E suites.
8. **Credentials docs** — `CREDENTIALS.local.example` (tracked), `CREDENTIALS.local.md` (gitignored copy). No default installer ID in code; fleet label is user-chosen at login.
9. **Root `npm run dev`** — `test:dzx` + `test:pwa` + `build:pwa` + `dev:pwa`.
10. **Local dev “Change password” UX** — Header always shows **Change password** in dev builds without gateway; opens `LocalDevPasswordHintDialog` explaining gateway is required for real updates (`PWA/src/auth/LocalDevPasswordHintDialog.tsx`).
11. **Field help on hover** — `TextField` / `NumberField` / `SelectField` / `ToggleField` use `HelpHint` (`PWA/src/components/HelpHint.tsx`): compact “i” glyph, tooltip bubble on hover, full text still exposed to assistive tech via `aria-describedby` + visually hidden span.
12. **Gateway `tsc`** — `dynamic_zero_export/pwa/contracts/session.ts` uses `../roles.js` import so `npx tsc -p gateway` passes under `moduleResolution: NodeNext`. Root **`npm run check:gateway`** and **`verify`** include it.
13. **Node-safe Vite env** — `PWA/src/viteMetaEnv.ts` (`viteEnv`, `viteIsDev`) so `AuthContext` / `gatewayEnv` load under Node unit tests; DZX API simulator tests bind **port 0** to avoid clashes with local gateway dev servers.

---

## 3. Auth and password update (current behavior)

| Mode | Login | Change password button | Behavior |
|------|-------|---------------------------|----------|
| **Gateway** (`VITE_GATEWAY_URL` set) | API | Shown | `ChangePasswordDialog` → `POST /api/auth/password` (min 8 chars), then logout to re-login |
| **Local dev** (no gateway URL, `DEV`) | In-browser dev passwords | Shown | `LocalDevPasswordHintDialog` — explains passwords are not persisted from UI; point to gateway + `CREDENTIALS.local.example` |
| **Production build, no gateway** | Effectively blocked at login | Hidden | No dev flag |

**Manufacturer:** extra **Reset accounts** when gateway + manufacturer role → admin reset API.

**Reference:** root `CREDENTIALS.local.example` (passwords, installer ID semantics, env vars).

---

## 4. Gateway API summary (implemented)

- `GET /api/health`
- `POST /api/auth/login` — `channel`, `password`, optional `siteId`, `installerId` (installer channel)
- `POST /api/auth/logout`, `GET /api/session`
- `POST /api/auth/password` — change own password (user / installer / manufacturer)
- `POST /api/auth/admin/reset-password` — manufacturer only
- `GET /api/sites`, `GET /api/sites/:siteId`, `PUT /api/sites/:siteId` — body `{ pwaSiteConfig }` for PUT; installer scope on site JSON

**Storage:** `CONFIG_DIR` (default `gateway/data/config`): `auth.json`, `audit.log`, `sites/*.json`.

---

## 5. PWA integration points

- **`PWA/src/auth/AuthContext.tsx`** — session, `fetchGateway`, `siteGatewaySyncAvailable`, login, password flows
- **`PWA/src/App.tsx`** — shell, notices, change-password / admin-reset modals, gateway site sync panel on Site tab
- **`PWA/playwright.config.ts`** — conditional `E2E_WITH_GATEWAY` webServer stack
- **`PWA/scripts/e2e-gateway-server.mjs`** — fresh `CONFIG_DIR` for gateway E2E
- **`PWA/src/components/HelpHint.tsx`** — field-level help: hover bubble + `aria-describedby` / `.sr-only` text

---

## 6. Status matrix

| Item | Status | Notes |
|------|--------|------|
| PWA commissioning UI + YAML bundle | **Done** | Core flows |
| Tab RBAC | **Done** | `tabAccess.ts` |
| Gateway auth + sessions | **Done** | In-memory sessions (restart clears) |
| MQTT discovery → site JSON | **Done** | Needs `MQTT_URL` |
| Password change (gateway) | **Done** | |
| Password hint (local dev) | **Done** | This handoff |
| Manufacturer admin reset | **Done** | |
| Site `pwaSiteConfig` sync | **Done** | Installer/manufacturer + bearer |
| Playwright default + gateway | **Done** | |
| ESP32 / board live sync with `SiteConfig` | **Not done** | Board APIs exist separately; no automatic push/pull to gateway sites |
| Commissioning summary API ↔ gateway sites | **Partial** | DZX simulator + `CommissioningPage`; in-app card links fleet file to **Site Setup → Gateway commissioning**; deeper payload merge still optional |
| CI / verify | **Done** | Includes gateway `npm ci`, **`check:gateway`**, dual E2E |

---

## 7. Recommended next work (prioritized)

1. **Board / fleet continuity** — Define how `boardIp` reads and optional push of slot maps align with `sites/*.json` or ESPHome packages (ESP32-side topology deferred).
2. **Session persistence on gateway** — Optional Redis/file session store if VPS restart should not log everyone out.
3. **Commissioning payload merge** — Optionally drive `CommissioningPage` summary fields from `pwaSiteConfig` when a fleet site id is selected (single source of truth in UI).

---

## 8. Commands cheat sheet

```bash
# Full gate (root)
npm run verify

# Dev loop after tests + build
npm run dev

# PWA only E2E
cd PWA && CI=1 npm run test:e2e

# Gateway-backed E2E (fresh auth dir)
cd PWA && CI=1 npm run test:e2e:gateway
```

---

## 9. Related docs (not superseded)

- `docs/implementation_checklist.md` — staged migration checklist for board + schema
- `docs/Plan_updated.md` — product vision and hardware notes
- `docs/dynamic_zero_export_commissioning.md` — DZX commissioning narrative
- `gateway/README.md` — env vars and HTTP summary

**Last updated:** 2026-04-24 (align with repo state on `dynamic-Zero-export`).
