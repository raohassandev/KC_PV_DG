# Mini PV Controller - Module Wise Execution Plan

This plan is based on the current planning documents, with `MASTER_IMPLEMENTATION_PLAN.md` treated as the execution source of truth where documents conflict.

## Execution Baseline

- Branch: `PV-DG-ESPS3`
- Target firmware path: `firmware/esp32-s3/`
- Hardware target: ESP32-S3 DevKitC-1, 16 MB flash, 8 MB PSRAM
- Canonical Modbus UART: UART1, TX GPIO17, RX GPIO16, DE/RE GPIO18
- UART0 GPIO43/GPIO44 is reserved for debug/monitor and must not be used for Modbus

## Module 1: ESP32-S3 Firmware Foundation

Scope:
- Confirm `firmware/esp32-s3/` builds under ESP-IDF.
- Keep `sdkconfig.defaults`, partition table, GPIO config, and boot flow aligned with the master plan.
- Validate WiFi AP/STA, NVS, OTA, pairing, diagnostics, and identity endpoints.

Tasks:
- Verify ESP-IDF build with `idf.py set-target esp32s3 && idf.py build`.
- Confirm the partition table ends exactly at 16 MB.
- Confirm ESP32-S3 PSRAM uses `CONFIG_SPIRAM=y`.
- Confirm `PVDG_HW_TARGET` is `esp32-s3`.
- Add hardware target, firmware version, uptime, MAC, and IP to `/whoami`.

Deliverable:
- ESP32-S3 firmware boots and exposes provisioning APIs.

## Module 2: Modbus RTU Core

Scope:
- Make Modbus safe for read/write control.
- Support multiple slave devices on one RS485 bus.

Tasks:
- Keep FC03 and FC04 read support.
- Add FC06 write single register.
- Add FC16 write multiple registers.
- Add UART mutex around all Modbus transactions.
- Add retry, timeout, CRC validation, and Modbus exception handling.
- Add 5 ms inter-frame RTU gap between transactions.
- Add counters for timeout, CRC, invalid response, and exception errors.

Deliverable:
- One shared Modbus core usable by meters, inverters, discovery, and the control loop.

## Module 3: Device Registry and Discovery

Scope:
- Store and discover Modbus devices dynamically.

Tasks:
- Define C structs for device config: protocol, port, slave ID, brand, polling config, and status.
- Store the device registry in NVS.
- Implement `POST /device/discover`.
- Scan configured slave ranges and detect responders.
- Classify known devices where possible.
- Save selected devices into the site config or registry.
- Expose device online/error state in diagnostics.

Deliverable:
- Mobile app can discover EM500, WM15, Huawei, and future devices, then save assignments.

## Module 4: Meter Adapters

Scope:
- Normalize grid and sub-meter readings into one telemetry shape.

Priority:
- Rozwell EM500: grid meter MVP.
- Carlo Gavazzi WM15: Phase 1 meter adapter.
- Iskra MC3, M4M, KPM37: later adapter phase.

Tasks:
- Move meter adapters under `firmware/esp32-s3/main/meters/`.
- Create a common meter snapshot struct.
- Normalize frequency, phase voltages, currents, total active power, power factor, and import/export energy.
- Validate EM500 power sign convention on real hardware before control is enabled.
- Add adapter-level error counters.

Deliverable:
- Grid meter snapshot is reliable and available to REST APIs and the control loop.

## Module 5: Inverter Adapter Framework

Scope:
- Provide a common interface for reading inverter telemetry and writing active power limits.

Tasks:
- Add `inverters/inverter_iface.h`.
- Add `inverters/inverter_registry.c`.
- Include `max_rated_w`, because Chint CPS uses watts instead of percent for active power limits.
- Implement Huawei SUN2000 first.
- Add string voltage, current, and temperature support.
- Add write-limit API with percent-to-brand conversion.
- Later add Growatt, Solis, GoodWe, Knox, and Chint adapters.

Deliverable:
- Huawei inverter can be read and actively limited over Modbus.

## Module 6: Polling Orchestrator

Scope:
- Poll all configured devices safely and publish a composite snapshot.

Tasks:
- Add `modbus_poll.c/.h`.
- Poll devices in a staggered schedule.
- Protect shared snapshot state with a mutex or double buffer.
- Add a FreeRTOS event group for fresh poll readiness.
- Mark devices offline after repeated failures.
- Reduce polling rate for offline devices.
- Publish latest snapshot to REST, WebSocket, MQTT, and the control loop.

Deliverable:
- One authoritative live snapshot for firmware, app, and telemetry outputs.

## Module 7: Policy Core Bridge

Scope:
- Wire the tested `dynamic_zero_export/firmware_core` C++ policy logic into ESP-IDF firmware.

Tasks:
- Add `firmware/esp32-s3/components/dzx_core/`.
- Link only production firmware_core sources.
- Exclude `simulator.cpp` from production firmware.
- Add `control_bridge.cpp`.
- Correctly call the existing C++ API: `evaluatePolicy(config, realMeterSample)`.
- Populate all required `RealMeterSample` fields:
  - `source`
  - `sourceKnown`
  - `importKw`
  - `exportKw`
  - `generatorKw`
  - `sampleTimeMs`
- Set source explicitly as `GRID`, `GENERATOR`, or `NONE`.

Deliverable:
- Firmware can ask the tested policy engine for a control decision.

## Module 8: Control Task

Scope:
- Implement real zero-export and generator-aware inverter limiting.

Tasks:
- Add `control_task.c/.h`.
- Run a 500 ms control loop.
- Wait for fresh poll events.
- Convert meter and inverter snapshots into policy inputs.
- Apply approximately 100 W deadband.
- Add ramp limiting:
  - Slow ramp up: 1 percent per 10 seconds.
  - Fast ramp down: 5 percent per second.
- Write inverter limit through the active inverter adapter.
- Hot-reload config when the NVS config version changes.
- Use fail-open behavior on meter stale/offline unless product decides otherwise.

Deliverable:
- Closed-loop zero export works with EM500 plus Huawei.

## Module 9: REST API

Scope:
- Complete firmware API contract for commissioning and monitoring.

Priority endpoints:
- `GET /whoami`
- `POST /pair`
- `POST /provision_wifi`
- `GET /provision_status`
- `GET /site/config`
- `PUT /site/config`
- `GET /telemetry/snapshot`
- `GET /control/status`
- `POST /device/discover`
- `GET /alarms`
- `GET /diagnostics`
- `POST /ota`

Later endpoints:
- `GET /energy/history`
- `GET /energy/export`
- `GET /system/logs`

Deliverable:
- Mobile app can fully commission and monitor the controller.

## Module 10: Energy History

Scope:
- Store durable power and control records on the controller.

Tasks:
- Initialize SPIFFS on the `history` partition.
- Add `energy_history.c/.h`.
- Store compact records: timestamp, grid W, solar W, load W, clamp percent, and flags.
- Add 1-minute records first.
- Add hourly and daily aggregation later.
- Add `GET /energy/history`.

Deliverable:
- App can show 24h, 7d, and 30d history from controller storage.

## Module 11: MQTT

Scope:
- Publish telemetry and alarms to a local broker first.

Tasks:
- Add `mqtt_client.c/.h`.
- Store broker config in NVS.
- Publish at 1 Hz.
- Use topic shape like `mini-pv/{device_id}/telemetry`.
- Publish alarms separately.
- Add reconnect and backoff handling.
- Defer TLS/cloud broker hardening until production phase.

Deliverable:
- Home Assistant, Node-RED, or a cloud bridge can consume telemetry.

## Module 12: WebSocket

Scope:
- Push live telemetry to mobile and web UIs.

Tasks:
- Add `/ws`.
- Broadcast latest snapshot every 1 second.
- Handle multiple clients.
- Avoid leaking client sessions.
- Use the same JSON contract as `/telemetry/snapshot`.

Deliverable:
- Mobile dashboard updates live without polling.

## Module 13: Generator Monitoring

Scope:
- Detect generator state and feed the policy engine.

Tasks:
- Add `gen_monitor.c/.h`.
- Configure GPIO5 as generator running input.
- Debounce the signal.
- Add generator source state machine.
- Optionally read a generator feeder meter later.
- Trigger generator min-load policy mode.

Deliverable:
- Controller changes behavior when generator is running.

## Module 14: Mobile App

Scope:
- Convert the skeleton app into a real commissioning and monitoring app.

Tasks:
- Implement AP pairing flow.
- Add WiFi provisioning and reconnect flow.
- Add device discovery UI.
- Add site config editor.
- Replace dashboard mock data with REST/WebSocket telemetry.
- Add alarms banner.
- Add history screen.
- Enforce owner, installer, and support roles.

Deliverable:
- Android app can commission, configure, monitor, and inspect history.

## Module 15: Testing and Validation

Scope:
- Make each module provable before field deployment.

Test layers:
- Existing TypeScript/runtime verification: `npm.cmd run verify`.
- Firmware build: ESP-IDF build on `firmware/esp32-s3`.
- Modbus unit tests: CRC, FC06, FC16 frame parsing.
- Hardware bench tests:
  - EM500 read.
  - Huawei read.
  - Huawei write limit.
  - Multi-device RS485 bus.
- Control validation:
  - Export sign convention.
  - Deadband.
  - Ramp up/down.
  - Meter offline fail-safe.
- Soak tests:
  - 8 hours initial.
  - 24 hours before field deployment.
  - 72 hours before production release.

Deliverable:
- Verified firmware and app behavior with measurable reliability targets.

## Recommended Execution Order

1. Firmware build and ESP32-S3 boot.
2. Modbus core FC06/FC16 plus mutex.
3. EM500 meter validation.
4. Huawei adapter read/write.
5. Polling orchestrator.
6. Control bridge and control task.
7. REST snapshot/status/discovery.
8. Mobile commissioning and live dashboard.
9. Energy history.
10. MQTT and WebSocket.
11. Additional meters and inverters.
12. Generator mode.
13. Hardening, security, and OTA rollback.

## Highest-Risk Items

- EM500 sign convention.
- Huawei active power limit write behavior.
- Modbus bus reliability with multiple devices.
- Config hot-reload while control loop is active.
- Fail-safe behavior when meter or inverter goes offline.

