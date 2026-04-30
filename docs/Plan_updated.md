# PV-DG Custom Firmware and Android Plan

Last updated: 2026-04-30

This branch is for the custom ESP32 firmware path and Android commissioning app. The old ESPHome firmware and PWA path are no longer the product direction here.

## Current Product Direction

- KC868-A6 / ESP32 controller runs custom ESP-IDF firmware.
- Android app is the primary field commissioning and monitoring client.
- EM500 / Rozwell grid meter is read directly by custom firmware over RS485 Modbus RTU.
- Dynamic Zero Export policy code remains the shared runtime/model reference.
- The controller must remain local-control-first and safe without internet access.

## Active Code Areas

- `firmware/esp32/`: ESP-IDF application, Wi-Fi/AP mode, NVS, HTTP API, RS485 Modbus, EM500 reads.
- `mobile/`: Expo/React Native Android commissioning app.
- `dynamic_zero_export/`: policy engine, simulator, contracts, examples, and tests.
- `docs/`: current hardware/API/product notes.

## Custom Firmware API Baseline

The Android app should configure and monitor the board through custom firmware endpoints:

- `GET /whoami`
- `POST /pair`
- `POST /provision_wifi`
- `GET /provision_status`
- `GET /site/config`
- `PUT /site/config`
- `GET /telemetry/snapshot`
- `GET /diagnostics`
- `POST /ota`
- `GET /ota/status`

ESPHome entity endpoints are not part of this branch's target contract.

## Hardware Facts To Preserve

- Controller platform: KC868-A6 / ESP32.
- RS485 Modbus RTU is the current meter link.
- EM500 / Rozwell grid meter is the confirmed meter.
- EM500 frequency register: `0x0032`.
- EM500 total active power register: `0x003A`.
- EM500 import energy uses the project-specific decode:
  - holding register `0x1B21`
  - 4 registers / QWORD
  - divide by `4294967296`
  - multiply by `0.01`

## Android App Scope

- Discover or manually connect to the controller.
- Pair with the controller and store the local token.
- Provision Wi-Fi when the board is in AP/setup mode.
- Save/load site configuration through the board API.
- Show live telemetry from `/telemetry/snapshot`.
- Show diagnostics, stale/offline state, and last update time.
- Support owner, installer, support, and manufacturer role views locally.

## Firmware Scope

- Boot into STA mode when Wi-Fi credentials exist.
- Fall back to AP/setup mode when not configured.
- Store Wi-Fi, pairing token, and site config in NVS.
- Read EM500 live values from RS485.
- Serve the local HTTP API for Android commissioning.
- Keep inverter command behavior gated until hardware validation.
- Keep generator and multi-source policy gradual and test-backed.

## Immediate Next Work

1. Build and flash `firmware/esp32` to the connected board.
2. Verify `/whoami`, `/pair`, `/telemetry/snapshot`, and `/diagnostics` from the laptop.
3. Verify EM500 values from RS485 in the custom firmware snapshot.
4. Point the Android app at the board and confirm probe, pairing, telemetry, and provisioning screens.
5. Remove remaining stale references to the deleted ESPHome/PWA path as they appear.
