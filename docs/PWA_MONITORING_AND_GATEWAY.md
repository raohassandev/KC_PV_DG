# PWA: Monitoring Shell, DZX Data Plane, Board, and Gateway

This document is the **canonical map** for how the PV-DG PWA is structured after the Dynamic Zero Export (DZX) monitoring refactor, how data reaches the UI, and how **board** vs **simulator/API** paths differ. Use it when onboarding or extending features.

---

## 1. Two planes: commissioning vs operation

| Area | Workspace (app shell) | Primary audience |
|------|------------------------|------------------|
| **Commissioning** | Site Setup, Topology, Slots, Validation, YAML, Engineer | Installer, manufacturer |
| **Operation** | **Live status** (Dashboard) + **Monitoring** (DZX product area) | Owner (user), installer, manufacturer |

Owners (`user` role) only see the **operation** workspace. Installers/manufacturers see both.

---

## 2. Operation workspace pages (`navModel.ts`)

- **`dashboard`** — Owner label: **Live status**. Board-backed telemetry, executive KPIs, charts (lazy-loaded). This is **not** the old separate “Overview” tab; overview-style content was merged here.
- **`dzx`** — Owner breadcrumb label: **Energy & monitoring** (nav list entry remains **Monitoring**). Hosts the **Monitoring** product shell (`ProductArea.tsx`).

Routing and labels live in `PWA/src/navModel.ts` and `PWA/src/App.tsx`.

---

## 3. Monitoring sub-tabs (`ProductArea` + `navigation.ts`)

Sub-navigation is rendered by `PWA/src/features/dynamic-zero-export/ProductArea.tsx` (`data-testid="monitoring-subnav"`).

| Tab id | UI label | Purpose |
|--------|----------|---------|
| `energy-history` | Energy History | Executive energy analytics (Recharts, intervals). |
| `reliability` | Reliability | **Single** surface for connectivity, reachability, alerts, and installer **integration settings** (provider mode, API base URL). Replaces separate Connectivity + Alerts tabs. |
| `commissioning` | Commissioning | DZX commissioning summary (hidden when `controllerRuntimeMode === 'sync_controller'`). |
| `diagnostics` | Diagnostics | **Local API only**: device `/api/device/info`, topology `/api/topology`, manufacturer snapshot preview. **Does not** duplicate Live status KPIs; a lede points users to **Live status** for plant KPIs. |

Feature tab ids for the shell are `FeaturePageId` in `PWA/src/features/dynamic-zero-export/navigation.ts`. Global DZX `navigationItems` and `rolePermissions.visiblePages` live under `dynamic_zero_export/pwa/`.

### Removed / deferred

- **`power-flow`** was removed from `navigationItems` and role `visiblePages` because **no PWA screen implemented it** in this shell. Re-add when a real-time power-flow view exists, then wire a `FeaturePageId` and lazy page.

---

## 4. Data sources: simulator, device API, and board

### 4.1 DZX “provider” (Monitoring tabs)

- **Provider mode** (`auto` | `api` | `mock`) is stored as `dzx.providerMode` (see `liveStatusService.ts`). UI control: `ProviderModeSelect.tsx` on **Reliability**.
- **API base URL** for the DZX client: `localStorage['dzx.apiBaseUrl']` or `VITE_DZX_API_BASE_URL` at build time (`provider.ts` / `apiClient.ts`).
- In development, the repo typically runs the **API simulator** (`dynamic_zero_export/api_simulator`) so `/api/*` routes match the DZX contract.

Monitoring pages load data through **services** (`connectivityService`, `alertsService`, `historyService`, `liveStatusService`, `diagnosticsService`) which call `createDzxProvider` / `createDzxApiClient`.

### 4.2 Board (ESPHome / controller HTTP)

- **Live status Dashboard** reads the **board IP** and entity map (`boardApi.ts`, `boardEntityMap.ts`, `DashboardOverview.tsx`) — this is the **commissioning site profile** path, not the DZX `/api` contract.
- **Discovery / probe**: `PWA/src/boardDiscovery.ts` — tries gateway **`GET /api/board/probe?baseUrl=...`** first, then direct `/whoami`, `/json`, or ESPHome text_sensor fallbacks.
- **LAN scan**: browser calls **`GET /api/board/scan`** on the **gateway** (see `gateway/src/index.ts`); the browser cannot scan the LAN by itself.

Gateway behavior is documented in `gateway/README.md`.

### 4.3 Mental model

| Question | Answer |
|----------|--------|
| Where do I see **grid / PV / inverter** live numbers? | **Live status** (Dashboard) from **board HTTP**. |
| Where do I see **DZX energy history, alerts feed, connectivity snapshot**? | **Monitoring** tabs, from **simulator or DZX device API** (`dzx.apiBaseUrl`). |
| Where do I point the app at a **physical DZX API** on the LAN? | **Reliability** → integration settings (API base URL) or env at build time. |

These two planes can point at the **same** device on a mature deployment, but the **code paths and contracts differ** today.

---

## 5. “Complete” vs still open (honest status)

### Implemented in software (this repo)

- PWA + gateway **board probe**, scan, reads, and validated **writes** (see `docs/implementation_checklist.md` Stage A, `docs/KC_PV_DG_Handover.md`).
- Monitoring **IA**: merged Reliability, trimmed Diagnostics, shared provider control, e2e coverage under `PWA/e2e/`.

### Not guaranteed by software alone

- **Every inverter / meter / site** validated on hardware (e.g. Huawei path, live plant write confirmation) — see `docs/KC_PV_DG_Handover.md` §7 bottlenecks.
- **Full onboarding contract** (`docs/onboarding_contract.md`) vs **ESPHome fallbacks** — firmware may implement only a subset; the PWA supports fallbacks intentionally.

---

## 6. Key files (quick index)

| Topic | Path |
|-------|------|
| App shell, tabs, DZX mount | `PWA/src/App.tsx` |
| Operation labels | `PWA/src/navModel.ts` |
| Monitoring shell | `PWA/src/features/dynamic-zero-export/ProductArea.tsx` |
| Reliability page | `PWA/src/features/dynamic-zero-export/pages/ReliabilityPage.tsx` |
| Diagnostics page | `PWA/src/features/dynamic-zero-export/pages/DiagnosticsPage.tsx` |
| DZX nav + types | `PWA/src/features/dynamic-zero-export/navigation.ts`, `dynamic_zero_export/pwa/navigation.ts`, `roles.ts`, `permissions.ts` |
| Live status role model | `PWA/src/features/dynamic-zero-export/services/liveStatusService.ts` (`buildDashboardModelForRole`) |
| Board probe | `PWA/src/boardDiscovery.ts`, `gateway/src/index.ts` |
| Board read/write | `PWA/src/boardApi.ts`, `PWA/src/boardWriteApi.ts`, `PWA/src/boardEntityMap.ts` |
| Site / board IP UI | `PWA/src/pages/SiteSetupPage.tsx` |

---

## 7. Changelog (high level)

- **Overview** monitoring tab removed; content folded into **Dashboard (Live status)**.
- **Connectivity** + **Alerts** merged into **Reliability**; `FeaturePageId` uses `reliability`.
- **Diagnostics** deduplicated vs Dashboard; Reliability enriches device block from **same** diagnostics API bundle when online.
- **`power-flow`** removed from permissions/navigation until a UI exists.
- Dead **`view-models/overview.ts`** and unused **`OverviewViewModel`** type removed; `buildOverviewModel` renamed to **`buildDashboardModelForRole`**.

When you add a major tab or change contracts, update **this file** and the relevant checklist in `docs/implementation_checklist.md`.
