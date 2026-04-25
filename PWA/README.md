# KC PV-DG PWA

Commissioning and **Dynamic Zero Export** web UI for the PV-DG stack (site profile, topology, slots, validation, YAML bundle, role-based tabs).

## Run

| Command | Purpose |
|---------|---------|
| `npm install` | Dependencies |
| `npm run dev` | Vite dev server (default **5173**) + DZX API simulator (**8787**) |
| `npm run build` | Production build |
| `npm test` | Node unit tests (feature modules) |

From the **repo root**, `npm run dev` runs DZX + PWA tests, builds this package, then starts `dev:pwa`.

## Gateway (fleet auth & sync)

Set **`VITE_GATEWAY_URL`** to the gateway base URL (no trailing slash), e.g. `http://127.0.0.1:8788`.

- Login goes to the gateway; bearer token stored for **Change password**, **Reset accounts** (manufacturer), and **Site Setup → Gateway commissioning** (load/save `pwaSiteConfig` in `sites/<siteId>.json`).
- On the login form, **Site ID (fleet)** sets which site file the session uses (default **`site-001`** if left blank). **Installer ID** applies when the role is Installer.

Defaults and env overrides: **`CREDENTIALS.local.example`** at the repo root.

## End-to-end tests (Playwright)

- **`npm run test:e2e`** — Playwright starts **`npm run dev:e2e`** (Vite **127.0.0.1:5183**, simulator port from **`E2E_SIM_PORT`** / **`PORT`**, default **18983** in `playwright.config.ts`). Use **`CI=1 npm run test:e2e`** in CI so the server is always started by Playwright.
- **`npm run test:e2e:gateway`** — Sets **`E2E_WITH_GATEWAY=1`**: ephemeral gateway `CONFIG_DIR` + Vite with `VITE_GATEWAY_URL` (see `scripts/e2e-gateway-server.mjs`).
- **Repo root:** `npm run test:e2e:pwa` and `npm run test:e2e:gateway:pwa`.

One-time browser install: `npx playwright install chromium` (or `PW_CHANNEL=chrome` — see `playwright.config.ts`).

## Architecture notes

- Auth: `src/auth/AuthContext.tsx`, `LoginScreen.tsx`, `tabAccess.ts` — **User** sign-in is the owner path (**energy & monitoring**, **live status**); default and gateway passwords are documented in **`../CREDENTIALS.local.example`**.
- Fleet merge helper: `src/auth/gatewaySiteConfig.ts`
- Main shell: `src/App.tsx`
- Layout primitives: `src/layout/FormGrid.tsx`, `src/layout/DocReaderLayout.tsx` (CSS modules; commissioning grids are not global “section soup”)
- DZX feature area: `src/features/dynamic-zero-export/`

Full history and status: **`../docs/AGENT_IMPLEMENTATION_PLAN.md`**.

Why each commissioning area exists (including **Templates**): **`../docs/Commissioning_IA.md`**.
