# KC_PV_DG Handover Document
_Last updated: 2026-04-15_

## 1) Project summary

This project is building a **PV-DG smart controller product** based on:

- **KC868-A6 / ESP32 board**
- **ESPHome modular firmware**
- **PWA / web app** for commissioning, monitoring, settings, templates, and later YAML/config generation

Long-term direction:
- board handles local control and field I/O
- PWA handles commissioning and operator/engineer workflow
- later the app will generate per-site config/YAML
- later remote access / fleet management can be added

Repo:
- `https://github.com/raohassandev/KC_PV_DG`

Repo structure currently confirmed:
- `Modular_Yaml`
- `PWA`
- `Testing`
- `docs`
- `old`

## 2) High-level decisions already made

### Board side
Use **ESPHome modular YAML** for now.
Do not try to make ESPHome fully runtime-dynamic yet.
Huawei deep testing is postponed until on-site access is available.

Current board-side status:
- EM500 live reads are verified
- board firmware is flashed and running
- web UI is active
- inverter command behavior remains pending on-site validation

### App side
Use a **PWA first**, not a native app first.
The PWA is now the main active track while site testing is blocked.

Current app-side status:
- live read path works
- core write path works
- bundle export generates a deployable ESPHome root YAML plus support files

### UI strategy
Do **not** rely on ESPHome UI as the final product UI.
ESPHome UI is for:
- debug
- firmware bring-up
- temporary service access

The real UI should live in the PWA.

## 3) Board-side status

### Confirmed working
- KC868 board boots and runs
- RS485 communication works
- EM500 / Rozwell live values are working
- modular YAML structure exists and is the current baseline
- ESPHome `web_server` is already present in `Modular_Yaml/base_board.yaml`
- PWA reads live board data
- PWA writes core controller settings
- PWA export bundle is generated and validated

### EM500 confirmed working live registers
These were validated from real hardware testing:
- Frequency: `0x0032`
- Total Active Power: `0x003A`
- voltage/current/power/PF live block works

### EM500 energy (important)
The EM500 import energy did **not** work exactly as documented in the meter PDF.
The tested working method for this actual meter is:

- `register_type: holding`
- `address: 0x1B21`
- `value_type: U_QWORD`
- divide by `4294967296`
- multiply by `0.01`

This decode matched the real meter reading in live testing.

### Huawei inverter status
Huawei is **not finished**.
Reason:
- no practical site access right now
- PWA/ESPHome testing can continue without it
- only minimal Huawei placeholders should remain until site visit

Do not burn time on Huawei now unless site test access is available.

Pending until site validation:
- inverter register verification
- inverter command write verification
- inverter power/setpoint control
- inverter alarm/status expansion beyond placeholders

## 4) Modular YAML status

Current direction:
- modular YAML is the correct structure going forward
- board config is split into files
- the main entry file is `Modular_Yaml/pv-dg-controller.yaml`

Key known module files:
- `base_board.yaml`
- `io_board.yaml`
- `service_ui.yaml`
- `meter_em500_grid.yaml`
- `inverter_huawei.yaml`
- `control_core.yaml`

Additional OLED / display work was attempted, but logger / display formatting caused crashes during one phase.

### Important board-side bug history
A crash occurred due to **bad logger formatting / NULL or invalid values** in formatted logs.
There was a Guru Meditation trace pointing into `control_core.yaml` and logger formatting.
Root issue:
- `%s` / float format mismatch
- unsafe use of string state at boot
- some `logger.log` formatting blocks were invalid

If board logging/UI is touched again:
- prefer safe lambda logging
- guard string state existence
- avoid mismatched format strings
- avoid passing units-suffixed strings into numeric parsing

## 5) PWA status

### Confirmed
The PWA exists and runs.
It currently has:
- dashboard
- site setup
- source slots
- templates
- engineer area
- YAML preview

### PWA architecture already started
Current important files mentioned and/or created:
- `src/App.tsx`
- `src/App.css`
- `src/siteTemplates.ts`
- `src/mockBoardData.ts`
- `src/boardEntityMap.ts`
- `src/boardApi.ts`
- `src/components/DashboardOverview.tsx`
- `src/components/EngineerActions.tsx`
- `src/boardWriteApi.ts`

The app was refactored from raw inline types to reusable data model files.

### PWA live read path
The PWA is now able to read live board values from the ESPHome web server.

Important discovery:
Opening these kinds of URLs works:
- `http://<board-ip>/sensor/Grid%20Frequency`

But generic URLs like these do **not** work:
- `/sensor`
- `/text_sensor`
- `/switch`

The ESPHome web API is entity-based, not domain-list based.

### Important API response detail
Real entity responses look like:

```json
{
  "name_id": "sensor/Grid Total Active Power",
  "id": "sensor-grid_total_active_power",
  "value": 8372.899,
  "state": "8372.90 W"
}
```

Very important:
- use `value` for machine parsing
- do **not** parse `state` as a number if it includes units

This was a major cause of bad reads in the PWA at one point.

## 6) Current PWA behavior

The PWA progressed through these stages:
1. static UI skeleton
2. mock data
3. live board read integration
4. board entity mapping
5. CSS improvements

Latest known good PWA status:
- data is updating
- UI is improved over the raw prototype
- real board values are being read
- this is now the active development path

## 7) Current project bottlenecks

### Blocked
- Huawei inverter real validation
- inverter write-path verification on live plant
- final commissioning flow
- remote access design

### Not blocked
- EM500 and board-side modular cleanup
- PWA architecture
- PWA live read dashboard
- entity mapping layer
- commissioning model
- YAML/config generation planning
- core PWA write actions
- bundle export generation
- site config structure

## 8) What should NOT be repeated in a new chat / Codex session

Do not restart from scratch on:
- EM500 meter decoding
- whether to use PWA
- whether ESPHome UI is enough
- whether modular YAML is the direction
- whether Huawei should block progress

These are already settled:
- EM500 live path is validated
- EM500 import energy decode is known
- PWA is the correct next track
- ESPHome UI is debug-only
- modular YAML is the board baseline
- Huawei waits for site testing

## 9) What the next assistant / Codex should do next

### Immediate next priority
Continue on the **PWA write + commissioning flow**, not deep board rework.

Recommended order:

1. **Verify and stabilize write actions from PWA to board**
   - controller enable
   - grid meter enable
   - inverter enable
   - control mode
   - numeric parameters like export limit, import limit, PV rated, deadband, gain, ramp
   - keep inverter command control pending until site validation

2. **Make write path exact and safe**
   - verify real ESPHome endpoints from the repo / running board
   - do not assume entity names blindly
   - use actual YAML names

3. **Improve the commissioning flow**
   - board IP entry / detection
   - source slot assignment
   - template selection
   - save/load site config

4. **Prepare config generation layer**
   - map `siteTemplates.ts` + slot model to generated YAML/config
   - do not generate full firmware yet unless structure is stable

5. **Keep Huawei minimal until site access**
   - no deep Huawei expansion until real plant testing is available

## 10) Exact repo-aware next milestone

The next milestone should be:

### “PWA can read and write core board settings reliably”

That means:
- live dashboard works
- engineer actions work
- board entity mapping is centralized
- site model is stable
- export bundle is generated
- Huawei/inverter command path remains pending for site testing
- engineer actions work
- board entity mapping is centralized
- site model is stable
- then commissioning workflow can expand

## 11) Suggested TODO list for the next session

### PWA
- verify `boardWriteApi.ts` against actual running entity names
- verify POST action patterns with the actual board
- add success/fail feedback per write action
- add “read current settings from board” so the engineer panel shows live values instead of defaults
- add site config save/load locally
- add source-slot-driven rendering
- add per-slot template visualization

### Board / YAML
- keep current modular YAML stable
- avoid experimental logger/display formatting unless needed
- avoid Huawei expansion for now
- keep EM500 unchanged unless a regression appears

## 12) Important technical notes

### ESPHome web server
Already present in board config.
This is the PWA read/write bridge for now.

### REST usage
Use exact entity URLs:
- `/sensor/<Entity Name>`
- `/text_sensor/<Entity Name>`
- `/switch/<Entity Name>`
- POST to action endpoints for control

### Numeric parsing
Prefer JSON `value` over `state`.

### Safety
Do not rely on board-side HTML customization as the final product.
The product UI belongs in the PWA.

## 13) Repo context snapshot

Verified from repo root:
- modular firmware and PWA are both already in the repo
- README still shows older one-off ESPHome commands plus the newer modular command path
- language mix in repo is now mostly TypeScript/CSS on top of the ESPHome side

This confirms the project has already shifted from “just YAML” to “board + app product” direction.

## 14) One-sentence handoff summary

This project is currently at the point where **EM500 board telemetry is stable, modular ESPHome exists, the PWA is running and reading live board data, and the correct next step is to finish reliable PWA write actions and commissioning flow while deferring Huawei deep work until on-site testing is available.**
