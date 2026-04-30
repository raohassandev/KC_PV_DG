# KC PV-DG Current Facts

Last updated: 2026-04-30

## Product Direction

- This branch targets custom ESP32 firmware, not ESPHome.
- Android is the field commissioning and monitoring client.
- The board must keep local control and telemetry working without cloud access.

## Hardware

- Controller: KC868-A6 / ESP32.
- Grid meter: EM500 / Rozwell over RS485 Modbus RTU.
- Inverter command behavior remains hardware-validation pending.
- Generator meter model remains pending.

## Verified EM500 Registers

- Frequency: input register `0x0032`.
- Total active power: input register `0x003A`.
- Import energy: holding register `0x1B21`, 4 registers/QWORD, divide by `4294967296`, multiply by `0.01`.

## Custom Firmware API

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

## Immediate Work

1. Build and flash `firmware/esp32`.
2. Confirm `/whoami` over LAN or AP mode.
3. Confirm `/telemetry/snapshot` includes real EM500 readings.
4. Confirm Android app probe, pairing, provisioning, and live dashboard against the board.
