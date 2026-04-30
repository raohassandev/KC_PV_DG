# PV-DG Smart Controller Modular Product Plan

Last updated: 2026-04-30

This is the current modular plan for the KC_PV_DG project. It replaces the old loose phase plan with feature modules that can be built, tested, and commissioned independently.

The product direction remains:

- KC868-A6 / ESP32 controller for local field control.
- ESPHome modular YAML as the current field firmware baseline.
- PWA as the main commissioning, monitoring, configuration, and export UI.
- Gateway for fleet auth, site sync, MQTT discovery, and remote support.
- Dynamic Zero Export runtime as the future custom firmware/API direction.

The system must always be local-control-first: the board must keep safe behavior without internet or cloud access.

---

## 1. Current Facts and Boundaries

### Confirmed

- KC868-A6 / ESP32 board is the controller platform.
- RS485 Modbus RTU is working.
- EM500 / Rozwell grid meter live telemetry is working.
- EM500 frequency is confirmed at `0x0032`.
- EM500 total active power is confirmed at `0x003A`.
- EM500 import energy is confirmed with the project-specific decode:
  - `register_type: holding`
  - `address: 0x1B21`
  - `value_type: U_QWORD`
  - divide by `4294967296`
  - multiply by `0.01`
- PWA can model sites, slots, templates, validation, YAML export, dashboard, gateway login, and Dynamic Zero Export monitoring.
- Gateway auth, site config sync, persisted sessions, and MQTT discovery are implemented in software.
- A commissioned site must be able to monitor realtime values through at least one supported data path:
  - local REST polling from board/controller
  - WebSocket stream from gateway/controller
  - MQTT telemetry through gateway/broker

### Pending / hardware blocked

- Huawei inverter register and write behavior are not site-validated.
- Inverter command writes must remain gated and conservative.
- Generator meter model and final wiring are not fully confirmed.
- ESPHome exported poll interval is not yet wired into runtime firmware polling.
- Full board-to-gateway live site config sync is not complete.

### Do not restart these decisions

- Do not replace the PWA with ESPHome Web UI as the final UI.
- Do not block PWA/gateway progress on Huawei site validation.
- Do not change EM500 decoding unless new hardware evidence proves it wrong.
- Do not make ESPHome fully runtime-dynamic before the app-generated config path is stable.

---

## 2. System Architecture Modules

### Module A: Field Controller Firmware

Path:

- `Modular_Yaml/`
- current entry: `Modular_Yaml/pv-dg-controller.yaml`

Purpose:

- Read field devices over Modbus RTU/TCP.
- Run local PV-DG control logic.
- Expose ESPHome entity HTTP endpoints for the PWA.
- Provide local service/debug access through ESPHome Web Server.
- Keep safe behavior when app, gateway, or internet is unavailable.

Features:

- KC868-A6 board definition and I/O mapping.
- RS485 bus on GPIO27/GPIO14.
- Optional second RTU bus over RS232 pins.
- EM500 grid meter polling.
- Generator meter placeholders for Gen1/Gen2.
- Huawei inverter placeholders up to 10 inverter slots.
- Controller mode selector:
  - `grid_zero_export`
  - `grid_limited_export`
  - `grid_limited_import`
  - disabled / monitoring-only behavior through enable switch.
- Runtime settings through ESPHome number/select/switch entities:
  - controller enable
  - grid meter enable
  - inverter enable
  - inverter write enable
  - export limit kW
  - import limit kW
  - PV rated kW
  - deadband kW
  - control gain
  - ramp percent step
  - min PV percent
  - max PV percent
- Control outputs:
  - PV command percent
  - PV command kW
  - control error kW
- Fail-safe baseline:
  - if controller disabled, grid meter disabled, or grid value invalid, command goes to safe zero output.
  - inverter write gate remains explicit.

Implementation details:

- Keep `base_board.yaml` responsible for board, Wi-Fi, web server, Modbus buses, globals, and Modbus controller instances.
- Keep `meter_em500_grid.yaml` as the verified EM500 grid source.
- Keep `service_ui.yaml` as the source of writable service entities used by PWA.
- Keep `control_core.yaml` focused on control math and safe command calculation.
- Avoid unsafe ESPHome logger formatting; guard strings and `NaN` values in lambdas.
- Keep absent inverter slaves suspended or skipped enough that they do not starve the grid meter on the shared bus.

Acceptance:

- Board boots and exposes ESPHome Web Server.
- Grid EM500 values read correctly.
- PWA entity reads match actual ESPHome entity names.
- PWA core writes update board settings.
- Controller does not command inverter unless write gate is enabled.
- Removing/inactivating optional inverter/generator slaves does not break grid telemetry.

Dependencies:

- Real KC868-A6 board.
- EM500 / Rozwell meter.
- Site access for Huawei write validation.

---

### Module B: Device Drivers and Register Library

Path:

- `gateway/src/builtinDriversData/`
- `PWA/src/types/driverLibrary.ts`
- `docs/driver_library.md`
- vendor docs under `docs/Inverter/` and `docs/Energy Analyzer/`

Purpose:

- Maintain reusable meter and inverter register definitions.
- Support commissioning templates without hand-writing registers per site.
- Separate verified registers from tentative/vendor-only registers.

Features:

- Driver profiles for supported meters and inverters.
- Register metadata:
  - address
  - function/register type
  - data type
  - scale
  - unit
  - sign convention
  - read/write support
  - validation status
- Supported meter classes:
  - grid meter
  - generator meter
  - virtual/downstream meter
- Supported inverter classes:
  - sync-command inverter
  - virtual-meter compatible inverter
- Verification flags:
  - lab verified
  - site verified
  - vendor document only
  - placeholder

Implementation details:

- Keep EM500 verified registers protected from accidental changes.
- Mark Huawei command registers as pending until site validation.
- Prefer structured driver data over copying register constants into UI components.
- Gateway `check:drivers` should continue validating built-in driver data.

Acceptance:

- Driver library clearly shows which registers are safe to use.
- PWA can present device templates from structured driver data.
- Export generator can include driver references and audit metadata.
- Unverified write-capable registers are visibly gated.

Dependencies:

- Vendor register maps.
- Bench/site validation results.
- Gateway driver validation script.

---

### Module C: Site Profile and Commissioning Schema

Path:

- `PWA/src/siteProfileSchema.ts`
- `PWA/src/siteTemplates.ts`
- `PWA/src/siteScenarioTemplates.ts`
- `PWA/public/site-templates/`
- `docs/site_profile_examples.md`

Purpose:

- Define the canonical site model used by PWA, gateway sync, YAML export, and future firmware API.

Features:

- Site identity:
  - site name
  - customer/site ID
  - installer ID
  - board IP/base URL
  - controller runtime mode
- Topology:
  - single bus
  - single bus with multiple generators
  - dual bus separate
  - dual bus combined
  - tie/breaker signal requirement when needed
- Source slots:
  - grid meter slots
  - generator meter slots
  - inverter slots
  - optional/disabled slots
- Per-slot settings:
  - role
  - enabled state
  - device template
  - Modbus unit ID
  - transport: RTU or TCP
  - TCP host/port where applicable
  - capacity/rating
  - bus/network assignment
  - display label
- Policy settings:
  - export/import limits
  - zero export enablement
  - generator minimum load policy
  - deadband
  - gain
  - ramp rates
  - fail-safe behavior

Implementation details:

- `siteProfileSchema.ts` remains the canonical model.
- `siteTemplates.ts` is a helper/catalog compatibility layer, not the schema owner.
- Scenario templates should be human-commissioning presets, not hidden business logic.
- Schema additions must round-trip through local storage, gateway `pwaSiteConfig`, and bundle export.

Acceptance:

- A complete site can be represented without editing YAML manually.
- Site config save/load round-trips without losing fields.
- Gateway stored `pwaSiteConfig` can restore the commissioning state.
- Example profiles exist for common topologies:
  - 1 grid + 1 inverter
  - 1 grid + 1 generator + inverter
  - 1 grid + 2 generators + inverter
  - dual bus separate
  - dual bus combined

Dependencies:

- PWA commissioning UI.
- Bundle generator.
- Gateway site API.

---

### Module D: PWA Commissioning Workspace

Path:

- `PWA/src/App.tsx`
- `PWA/src/pages/SiteSetupPage.tsx`
- `PWA/src/pages/SourceSlotsPage.tsx`
- `PWA/src/pages/CommissioningValidationPage.tsx`
- `PWA/src/pages/YamlExportPage.tsx`
- `PWA/src/components/TopologyWizard.tsx`
- `PWA/src/components/EngineerActions.tsx`

Purpose:

- Give installers/manufacturers a complete guided workflow for configuring a site.

Features:

- Login and role-based access.
- Site setup:
  - site identity
  - board IP/base URL
  - controller discovery/probe
  - gateway site load/save
  - Wi-Fi provisioning path where supported
- Topology wizard:
  - choose site electrical topology
  - define bus/network structure
  - define tie/combined behavior
- Source slots:
  - assign grid meters
  - assign generator meters
  - assign inverter groups
  - assign Modbus IDs and transport
  - enable/disable optional devices
- Templates:
  - select supported device profiles
  - show verification status
  - warn for unverified write registers
- Validation:
  - missing grid meter
  - duplicate Modbus IDs on same bus
  - missing inverter mapping
  - invalid dual-bus tie settings
  - generator minimum-load policy gaps
  - unsupported runtime mode
- Engineer actions:
  - read live board values
  - write core settings
  - enable/disable controller sections
  - apply limits and tuning values
  - export bundle
- YAML/config preview:
  - generated firmware root
  - site config
  - contract
  - commissioning summary

Implementation details:

- Keep operator pages separate from installer/manufacturer commissioning pages.
- Keep advanced catalog controls hidden unless needed.
- Every write should show success/failure feedback.
- Machine parsing must use ESPHome JSON `value`, not unit-suffixed `state`.
- Board entity names must come from centralized maps.

Acceptance:

- Installer can configure a site from empty/default state to export bundle.
- Manufacturer can load/save site config through gateway.
- Invalid commissioning state is visible before export.
- PWA can operate without gateway in local dev/lab mode.

Dependencies:

- Site schema.
- Board read/write API.
- Gateway auth/site APIs.
- Driver library.

---

### Module E: PWA Live Status and Monitoring Workspace

Path:

- `PWA/src/components/DashboardOverview.tsx`
- `PWA/src/boardApi.ts`
- `PWA/src/boardEntityMap.ts`
- `PWA/src/features/dynamic-zero-export/`
- `docs/PWA_MONITORING_AND_GATEWAY.md`

Purpose:

- Provide daily operation visibility for owners, installers, and manufacturers.

Features:

- Live status dashboard from board HTTP:
  - grid power
  - grid voltage/current/frequency
  - grid energy
  - inverter power/status
  - generator power/status
  - controller state
  - PV command percent/kW
- Realtime monitoring transport selection:
  - REST polling for ESPHome/current board fallback
  - WebSocket stream for gateway/controller live updates
  - MQTT-backed gateway stream for remote/fleet monitoring
- Site monitoring readiness:
  - configured site has a monitoring source
  - stale-data detection
  - last update timestamp
  - online/offline status
  - transport mode indicator
- Monitoring product area:
  - energy history
  - reliability/connectivity
  - commissioning summary
  - diagnostics
- Provider modes:
  - auto
  - API
  - mock
- DZX API base URL support for simulator or future physical controller.
- Owner role view:
  - operation pages only
  - no commissioning controls.

Implementation details:

- Board live dashboard uses ESPHome/entity endpoints.
- DZX monitoring uses `/api/*` simulator/device contract.
- REST polling is the current fallback and should remain available for ESPHome boards.
- WebSocket should be the preferred browser realtime channel when gateway or custom firmware provides live snapshots.
- MQTT should terminate at the gateway or backend for browser/PWA use; do not require browsers to connect directly to a broker unless explicitly designed and secured.
- Keep these data planes explicit until firmware unifies them.
- Diagnostics should not duplicate dashboard KPIs.

Acceptance:

- Owner can see live plant status without accessing commissioning.
- Installer/manufacturer can switch between operation and commissioning.
- Simulator-backed monitoring works during development.
- Real board-backed dashboard works on LAN when board IP is configured.
- A configured site shows realtime status or a clear reason why monitoring is not connected.
- Stale telemetry is visible and does not look like valid live data.

Dependencies:

- Board entity map.
- DZX API simulator or future controller API.
- Role permissions.

---

### Module F: Board Read/Write HTTP Contract

Path:

- `PWA/src/boardApi.ts`
- `PWA/src/boardWriteApi.ts`
- `PWA/src/boardDiscovery.ts`
- `PWA/src/boardEntityMap.ts`
- `PWA/src/boardSlotEntityMap.ts`
- `docs/onboarding_contract.md`

Purpose:

- Define the practical bridge between PWA and board during the ESPHome phase.

Features:

- Entity reads:
  - `/sensor/<Entity Name>`
  - `/text_sensor/<Entity Name>`
  - parse JSON `value` first
- Switch writes:
  - `/switch/<Entity Name>/turn_on`
  - `/switch/<Entity Name>/turn_off`
- Select writes:
  - `/select/<Entity Name>/set?option=<option>`
- Number writes:
  - `/number/<Entity Name>/set?value=<value>`
- Board discovery:
  - `/whoami` for custom firmware path
  - `/json` or ESPHome fallbacks
  - gateway-assisted scan/probe when browser cannot scan LAN directly
- Provisioning contract:
  - `POST /provision_wifi`
  - `GET /provision_status`

Implementation details:

- Keep ESPHome entity names exact and URL encoded.
- Centralize entity names; do not duplicate literal strings across components.
- Add read-back sync for writable settings where possible.
- Treat failed writes as visible UI errors, not silent failures.

Acceptance:

- PWA can read the current board snapshot.
- PWA can write core service settings.
- PWA can show whether a write succeeded.
- PWA can reconnect to the last known board IP.
- Custom firmware can later implement `/whoami` without breaking ESPHome fallback.

Dependencies:

- ESPHome Web Server v3.
- Gateway scan/probe API for LAN scan.
- Board firmware entity naming.

---

### Module G: YAML and Configuration Bundle Generator

Path:

- `PWA/src/siteBundleGenerator.ts`
- `Export/`
- `Modular_Yaml/`

Purpose:

- Convert a commissioned site profile into deployable/auditable configuration artifacts.

Features:

- Generated root firmware YAML:
  - `pv-dg-controller.generated.yaml`
- Site config:
  - `site.config.yaml`
- Contract:
  - `site.contract.yaml`
- Service/UI module references.
- Commissioning summary:
  - selected topology
  - slot mapping
  - device templates
  - policy values
  - warnings
  - derived zones
- Export bundle preview in PWA.
- Download/export from browser.

Implementation details:

- Keep the generated bundle compatible with existing modular ESPHome packages.
- Do not generate unsupported runtime-dynamic behavior into ESPHome.
- Align exported `poll_interval_ms` with firmware substitutions or document mismatch until fixed.
- Include enough metadata for future support/audit.

Acceptance:

- Exported bundle can be reviewed without opening the app.
- Generated root YAML includes the expected modular packages.
- Exported site config matches the PWA state.
- Validation warnings appear in the commissioning summary.
- Known unsupported items are marked instead of silently generated.

Dependencies:

- Site schema.
- Validation engine.
- Modular firmware structure.

---

### Module H: Gateway and Fleet Services

Path:

- `gateway/`
- `PWA/src/auth/`
- `PWA/src/auth/gatewaySiteConfig.ts`
- `docs/VPS_DEPLOYMENT.md`
- `docs/SUBDOMAIN_PWA_ACCESS.md`

Purpose:

- Provide secure fleet login, site config sync, discovery ingestion, and remote support foundations.

Features:

- Auth roles:
  - user / owner
  - installer
  - support
  - manufacturer
- Password operations:
  - change own password
  - manufacturer reset accounts
- Persistent sessions:
  - `sessions.json`
- Site APIs:
  - list sites
  - get site
  - save `pwaSiteConfig`
  - installer-scoped site access
- MQTT discovery:
  - topic namespace for site/controller discovery
  - site JSON storage
- Realtime site data services:
  - REST endpoints for latest snapshot/history
  - WebSocket fan-out for browser/mobile realtime views
  - MQTT ingestion from boards/controllers
  - last-seen/offline tracking
  - per-site telemetry authorization
- Audit log:
  - JSON lines
  - append and fsync
- CORS configuration for PWA deployment.

Implementation details:

- Keep storage file-based until fleet scale requires Redis/DB.
- Keep writes atomic for auth/session/site files.
- Keep manufacturer actions audited.
- Keep gateway optional for local/lab PWA use.
- Keep command/control separate from telemetry. MQTT telemetry can be broad; remote commands must be explicit, authenticated, audited, and role-gated.
- Prefer gateway WebSocket for PWA/mobile realtime display even when the upstream device uses MQTT.

Acceptance:

- PWA can log in through gateway when `VITE_GATEWAY_URL` is set.
- Manufacturer can save/load site commissioning config.
- Installer sees only allowed sites.
- Sessions survive gateway restart.
- Authenticated clients can subscribe to live telemetry only for allowed sites.
- Gateway can expose latest site snapshot through REST and stream updates through WebSocket.
- Gateway E2E tests pass.

Dependencies:

- Node gateway runtime.
- Deployment environment.
- Optional MQTT broker.

---

### Module N: WiFi Provisioning and Network Manager

Path:

- `docs/onboarding_contract.md`
- `PWA/src/boardDiscovery.ts`
- `PWA/src/pages/SiteSetupPage.tsx`
- `firmware/esp32/main/wifi.c`
- `firmware/esp32/main/nvs_store.c`
- `Modular_Yaml/base_board.yaml`

Purpose:

- Make board network setup reliable for field engineers without requiring an OLED or manual serial console.

Features:

- AP fallback mode for unconfigured boards.
- LAN client mode after provisioning.
- Saved WiFi credentials in NVS/firmware storage.
- Board identity:
  - device name
  - controller ID
  - MAC
  - IP
  - firmware version
  - capabilities
- Provisioning endpoints:
  - `GET /whoami`
  - `POST /provision_wifi`
  - `GET /provision_status`
- Reconnect behavior:
  - retry saved WiFi
  - fall back to AP after failure
  - expose setup-mode status to PWA/mobile
- mDNS/device-name support where possible.
- PWA/mobile provisioning screen:
  - detect AP-mode board
  - submit SSID/password
  - show progress
  - guide user back to LAN mode

Implementation details:

- ESPHome supports WiFi fallback today, but the custom firmware path must implement the explicit onboarding contract.
- Do not store WiFi passwords in gateway site JSON or exported public artifacts.
- PWA should treat provisioning as a local board operation, not a cloud requirement.
- LAN discovery can use gateway-assisted scan because browsers cannot scan the LAN directly.

Acceptance:

- A new board can be configured onto site WiFi without serial access.
- PWA/mobile can identify whether the board is in AP setup mode or LAN mode.
- Failed WiFi join shows a clear reason/status.
- Reboot preserves successful network configuration.

Dependencies:

- Board firmware support.
- PWA/mobile site setup UI.
- Local network access.

---

### Module O: Realtime Telemetry, MQTT, WebSocket, and REST API

Path:

- `gateway/src/index.ts`
- `gateway/src/mqttDiscovery.ts`
- `dynamic_zero_export/api_contract/`
- `dynamic_zero_export/api_simulator/`
- `PWA/src/features/dynamic-zero-export/services/`
- `mobile/src/api/`

Purpose:

- Define how a configured site publishes, stores, and displays live monitoring data across local and remote clients.

Features:

- Supported data paths:
  - REST latest snapshot: simple polling and compatibility.
  - WebSocket live stream: realtime PWA/mobile updates.
  - MQTT telemetry: controller-to-gateway/broker publishing.
- MQTT topics:
  - discovery topic per installer/site/controller
  - telemetry topic per site/controller
  - heartbeat/status topic
  - optional alarm/event topic
- Payloads:
  - controller identity
  - timestamp
  - grid measurements
  - generator measurements
  - inverter measurements
  - controller mode/state
  - alarms
  - connectivity status
  - firmware/runtime version
- Gateway behavior:
  - validate site authorization
  - store latest snapshot
  - update last-seen timestamp
  - expose latest snapshot by REST
  - fan out updates over WebSocket
  - mark stale/offline after timeout
- Client behavior:
  - PWA/mobile choose best available transport
  - show transport mode
  - show stale/offline state
  - fall back from WebSocket to REST polling
- Command policy:
  - telemetry is allowed by MQTT
  - remote commands are a separate future contract
  - commands require role authorization, audit, and explicit enablement

Implementation details:

- Use REST polling first for current ESPHome boards.
- Use MQTT for remote board-to-gateway telemetry because it is resilient over unstable networks.
- Use WebSocket from gateway to PWA/mobile because it fits browser/mobile realtime UX better than direct MQTT.
- Keep DZX API contracts aligned with realtime snapshot shape where possible.
- Do not mix commissioning config writes with telemetry ingestion.

Acceptance:

- A configured site can show live values through REST, WebSocket, or MQTT-backed gateway stream.
- Offline/stale site state is deterministic and visible.
- Owner, installer, and manufacturer roles only see telemetry for authorized sites.
- Telemetry payload shape is documented and testable.
- Browser/mobile clients can reconnect without losing the last known snapshot.

Dependencies:

- Gateway runtime.
- Optional MQTT broker.
- Board/custom firmware MQTT publisher or gateway probe bridge.
- PWA/mobile monitoring services.

---

### Module I: Dynamic Zero Export Runtime and API

Path:

- `dynamic_zero_export/`
- `PWA/src/features/dynamic-zero-export/`

Purpose:

- Build the future runtime/API foundation for topology-aware dynamic zero export and virtual meter behavior.

Features:

- Normalized site config.
- Policy engine:
  - zero export
  - limited export/import
  - generator minimum-load protection
  - topology-aware zones
  - fail-safe states
- Source detection:
  - grid
  - generator
  - none
  - ambiguous
- Virtual meter model:
  - pass-through
  - adjusted
  - safe fallback
- Monitoring snapshot:
  - live status
  - alerts
  - connectivity
  - history
- API simulator:
  - local development server
  - stateful tests
- Adapter stubs:
  - brand profiles
  - meter input
  - inverter output

Implementation details:

- Keep this tree separate from current ESPHome production firmware.
- Use it to harden contracts and policy math before custom firmware depends on it.
- Keep PWA monitoring compatible with simulator and future device API.
- Do not claim production Modbus driver support until real adapters exist.

Acceptance:

- `npm test` passes in `dynamic_zero_export`.
- `npm run check` passes in `dynamic_zero_export`.
- PWA monitoring can use the simulator.
- Policy behavior is deterministic for example site configs.

Dependencies:

- TypeScript runtime package.
- API simulator.
- Future custom firmware integration.

---

### Module J: Custom ESP-IDF Firmware Track

Path:

- `firmware/esp32/`
- `dynamic_zero_export/firmware_core/`

Purpose:

- Provide the future replacement path for ESPHome when runtime APIs, onboarding, and deeper control need custom firmware.

Features:

- ESP-IDF application shell.
- Wi-Fi STA/AP behavior.
- NVS configuration storage.
- HTTP identity endpoint:
  - `GET /whoami`
- OTA foundation.
- Modbus RTU driver foundation.
- EM500 read support.
- Firmware core C++ tests for DZX policy/control.

Implementation details:

- Treat ESPHome modular YAML as current field baseline until custom firmware reaches feature parity.
- Implement onboarding contract intentionally, not by copying ESPHome endpoints.
- Keep custom firmware API aligned with `docs/onboarding_contract.md`.
- Use `dynamic_zero_export/firmware_core` for portable policy logic where possible.

Acceptance:

- Firmware builds under ESP-IDF.
- Board can identify itself through `/whoami`.
- Wi-Fi provisioning path is testable.
- Modbus read and policy logic match DZX tests before field replacement.

Dependencies:

- ESP-IDF environment.
- Hardware bench.
- Firmware packaging and flashing workflow.

---

### Module K: Mobile App Track

Path:

- `mobile/`

Purpose:

- Optional native/mobile commissioning client after the PWA workflow is stable.

Features:

- Expo-managed React Native app.
- Dashboard, board, site, gateway, and export screens.
- Role-based app experience:
  - owner/user: live status, alarms, energy history, approved controls only
  - installer: commissioning, board setup, site sync, validation, export
  - support: diagnostics and guided support tools
  - manufacturer: fleet/site administration, password reset, templates, driver library
- Redux Toolkit state.
- AsyncStorage persistence.
- Direct LAN HTTP to ESPHome/custom board.
- Gateway login and session restore.
- Realtime monitoring:
  - REST polling fallback
  - WebSocket stream from gateway/custom controller
  - MQTT-backed telemetry through gateway
- Android-specific requirements:
  - cleartext LAN HTTP allowed only for local board access
  - background/resume refresh of latest site snapshot
  - offline cached last-known values with stale indicator

Implementation details:

- Keep PWA as the product-leading UI.
- Reuse domain models from PWA where practical.
- Do not fork the commissioning rules into a separate undocumented model.
- Mobile role permissions must match PWA/gateway permissions.
- Android app should not connect directly to MQTT unless a secure broker/client policy is explicitly designed; prefer gateway WebSocket/REST.

Acceptance:

- Mobile app can connect to board over LAN.
- Mobile site config matches PWA schema.
- Mobile does not become the only place a feature exists.
- Android role views match PWA role views.
- Android can monitor a configured site in realtime or show a clear disconnected/stale state.
- Android can resume from background and refresh the current site snapshot.

Dependencies:

- Stable schema.
- Stable board/gateway APIs.
- Stable auth/role contract.
- Realtime telemetry contract.

---

### Module L: Testing, Validation, and CI

Path:

- root `package.json`
- `PWA/e2e/`
- `PWA/src/features/dynamic-zero-export/tests/`
- `dynamic_zero_export/tests/`
- `dynamic_zero_export/api_simulator/tests/`
- `gateway/src/validateBuiltinDrivers.ts`

Purpose:

- Keep product behavior stable while firmware, PWA, gateway, and DZX evolve.

Features:

- Root verification:
  - DZX typecheck
  - gateway typecheck
  - driver validation
  - DZX tests
  - PWA tests
  - PWA build
  - PWA Playwright
  - PWA + gateway Playwright
- Unit tests:
  - policy engine
  - config validation
  - monitoring snapshots
  - PWA services
  - role navigation
- E2E:
  - app shell
  - navigation
  - templates
  - dashboard/export
  - gateway site sync
  - board/probe flows where simulated
- Hardware tests:
  - ESPHome config compile
  - board read/write endpoints
  - RS485 register validation
  - inverter write validation on site

Implementation details:

- Software tests should not require physical hardware.
- Hardware-only acceptance should be documented separately and not faked.
- Keep screenshots/playwright coverage for major UI route changes.

Acceptance:

- `npm run verify` passes for software changes.
- Hardware blockers are documented with exact missing validation.
- New schema/export fields include test coverage.

Dependencies:

- Node dependencies installed in subprojects.
- Playwright browser installed locally/CI.
- Hardware bench for board-specific tests.

---

### Module M: Deployment and Operations

Path:

- `docker-compose.yml`
- `PWA/Dockerfile`
- `gateway/Dockerfile`
- `docs/VPS_DEPLOYMENT.md`
- `docs/SUBDOMAIN_PWA_ACCESS.md`
- `scripts/`

Purpose:

- Make local development, VPS deployment, and field service repeatable.

Features:

- PWA deployment.
- Gateway deployment.
- Environment variables:
  - `VITE_GATEWAY_URL`
  - `PORT`
  - `CONFIG_DIR`
  - `MQTT_URL`
  - `MQTT_DISCOVERY_TOPIC`
  - initial passwords
  - CORS origins
- Docker support.
- Firmware export script.
- ESP serial probe script.
- Documented local dev commands.

Implementation details:

- Keep secrets out of git.
- Use `CREDENTIALS.local.example` as the tracked template.
- Keep gateway data under explicit `CONFIG_DIR`.
- Use subdomain docs for production access.

Acceptance:

- New developer can run PWA locally.
- Gateway can run locally or on VPS.
- PWA can point to gateway by env var.
- Deployment docs match actual scripts and ports.

Dependencies:

- VPS or local host.
- DNS/subdomain setup for production.
- MQTT broker if discovery is enabled.

---

## 3. Feature Milestones

### Milestone 1: Stable ESPHome + PWA Board Control

Goal:

- PWA reads and writes the current ESPHome board reliably.

Complete features:

- Board IP entry and probe.
- Dashboard live values from EM500.
- Controller enable/disable.
- Grid meter enable/disable.
- Inverter enable/disable.
- Inverter write gate.
- Control mode write.
- Numeric tuning writes.
- Read-back display for writable settings where possible.
- Clear success/failure feedback.

Acceptance:

- Engineer can change settings from PWA and verify them from board state.
- Failed board requests show clear errors.
- EM500 readings remain stable.

Status:

- Mostly implemented in software.
- Needs continued hardware verification for write/read-back on the real board.

---

### Milestone 2: Complete Commissioning Model and Export

Goal:

- A field engineer can define a real site, export all required artifacts, and connect that site to monitoring.

Complete features:

- Site identity.
- Topology wizard.
- Source slots with transport and Modbus IDs.
- Device template selection.
- Policy settings.
- Validation warnings.
- YAML/config bundle export.
- Gateway save/load of `pwaSiteConfig`.
- Monitoring source configuration:
  - board REST base URL
  - gateway site ID
  - realtime transport preference
  - MQTT telemetry topic metadata where applicable
- Monitoring readiness check:
  - latest snapshot available
  - stale/offline indicator
  - authorized role can view the site

Acceptance:

- Example sites can be created without editing YAML.
- Export contains root YAML, site config, contract, and summary.
- Gateway reload restores the same commissioning state.
- A commissioned site can be opened in Live Status and shows realtime data or a clear disconnected reason.

Status:

- Core software is implemented.
- Needs continued schema hardening for transport, multi-generator, and dual-bus details.

---

### Milestone 3: Huawei/Inverter Site Validation

Goal:

- Confirm real inverter read/write behavior safely on site.

Complete features:

- Confirm Huawei model.
- Confirm actual power read register.
- Confirm rated/max power register.
- Confirm power limit write register and scaling.
- Confirm remote scheduling/write enable requirements.
- Confirm inverter response and read-back behavior.
- Confirm safe disable/fail-safe behavior.
- Document tested values in driver library.

Acceptance:

- Inverter commands are proven on real hardware.
- PWA write gate protects the command path.
- Driver library marks registers as site verified.
- Firmware can command inverter without unsafe assumptions.

Status:

- Pending site access.

---

### Milestone 4: Generator and Multi-Source Policy

Goal:

- Extend from grid-only zero export toward safe PV-DG generator behavior.

Complete features:

- Generator meter slots.
- Generator running/source detection.
- Generator rating and minimum-load settings.
- Reverse power protection behavior.
- Fast PV reduction when generator loading becomes unsafe.
- Separate handling for one/two/three generator scenarios.
- Warnings when source state is ambiguous.

Acceptance:

- Controller protects generator minimum loading.
- Policy behaves predictably when generator source is stale/missing.
- PWA validation catches incomplete generator mapping.

Status:

- Policy concept documented.
- Firmware implementation should be gradual and hardware validated.

---

### Milestone 5: Dual-Bus and Zone-Aware Control

Goal:

- Support more complex sites with independent or combined electrical buses.

Complete features:

- Bus/network assignment for each meter and inverter group.
- Dual-bus separate mode.
- Dual-bus combined mode.
- Tie/breaker status requirement where needed.
- Derived control zones.
- Per-zone policy summary.
- Validation for invalid/ambiguous bus mapping.

Acceptance:

- PWA can model dual-bus sites clearly.
- Export includes derived zones and tie assumptions.
- Controller does not assume combined operation without signal/config.

Status:

- DZX policy model supports the concept.
- ESPHome field support should be added only after simpler sites are stable.

---

### Milestone 6: Dynamic Zero Export / Virtual Meter Product Mode

Goal:

- Move beyond direct inverter writes by supporting virtual meter behavior where suitable.

Complete features:

- Runtime mode selection:
  - `sync_controller`
  - `dzx_virtual_meter`
- Upstream real meter normalization.
- Policy-adjusted downstream virtual meter.
- Brand profile selection.
- Virtual meter Modbus output.
- Fail-safe virtual meter clamp.
- PWA monitoring through DZX API.

Acceptance:

- Inverter can self-curtail from the controller's virtual meter output.
- DZX simulator and firmware core agree on policy behavior.
- PWA clearly shows runtime mode and diagnostics.

Status:

- Software contracts and simulator exist.
- Production firmware/device implementation remains future work.

---

### Milestone 7: Fleet Remote Support

Goal:

- Enable remote site support without taking control away from the local board.

Complete features:

- Gateway deployment.
- Secure role login.
- Site discovery ingestion by MQTT.
- Site commissioning config sync.
- MQTT telemetry ingestion.
- REST latest-snapshot API.
- WebSocket realtime stream for PWA/mobile.
- Audit trail.
- Password management.
- Optional remote diagnostics.
- Future OTA workflow.

Acceptance:

- Manufacturer can inspect and update saved commissioning config.
- Installer access is scoped.
- Gateway restart does not lose sessions.
- Local board continues operating if gateway is offline.
- PWA and Android can monitor authorized remote sites through gateway realtime services.

Status:

- Core gateway/PWA software is implemented.
- OTA and board live sync are future field work.

---

## 4. Immediate Next Work

Recommended order:

1. Stabilize PWA board write/read-back for real ESPHome entities.
2. Define the realtime telemetry contract: REST latest snapshot, WebSocket stream, MQTT topics, stale/offline rules.
3. Add monitoring readiness to site commissioning so a configured site must connect to Live Status.
4. Align Android roles with PWA/gateway roles and add realtime/stale monitoring behavior.
5. Fix or document the `poll_interval_ms` export vs firmware `modbus_device_poll_interval` mismatch.
6. Add stronger validation for duplicate Modbus IDs, transport settings, and dual-bus mappings.
7. Expand site examples for common generator and dual-bus layouts.
8. Keep Huawei command work pending until site validation is available.
9. Add explicit driver verification status to all write-capable inverter templates.
10. Keep `npm run verify` passing after each software change.

---

## 5. Done Definition for the Product

The product is considered complete when:

- A site can be commissioned from the PWA without hand-editing YAML.
- A commissioned site can monitor realtime values through REST polling, WebSocket, or MQTT-backed gateway telemetry.
- PWA and Android enforce the same owner, installer, support, and manufacturer roles.
- Realtime views show transport mode, last update time, and stale/offline state.
- EM500/grid telemetry and energy readings are correct.
- Inverter read and command behavior is verified on real hardware.
- Generator protection policy is verified on a real or hardware-in-loop setup.
- Exported configuration builds and runs on the board.
- Operator dashboard works for daily use.
- Installer/manufacturer workflows work locally and through gateway.
- Fail-safe behavior is deterministic and documented.
- All software verification passes.
- Hardware validation notes clearly identify supported device models and firmware versions.
