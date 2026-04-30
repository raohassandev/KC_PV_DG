# Firmware Core — Onboarding & Controller Modes

This document bridges the **product onboarding requirements** (no OLED, AP + LAN discovery) with the **two root controller modes**.

---

## 1) Identity & onboarding endpoints (future embedded networking)

The firmware core will expose minimal HTTP endpoints when the ESP32 networking layer is added.

### `GET /whoami` (MVP)

Returns identity and capabilities for the commissioning client.

Example fields:
- `deviceName`, `controllerId`, `mac`, `ip`, `fwVersion`
- `capabilities`: `{ syncMode, dzxMode, modbusRtu, modbusTcp, apProvisioning }`

### `POST /provision_wifi` and `GET /provision_status`

AP mode provisioning endpoints used by the commissioning client.

Notes:
- Custom firmware owns AP provisioning directly at `192.168.4.1`.
- In firmware_core/custom firmware, these endpoints become first-class.

See also: `docs/onboarding_contract.md` (repo-level contract).

---

## 2) Root operating modes

### Mode A — `dzx_virtual_meter` (Dynamic Zero Export)

Goal: let the **inverter self-curtail** by reading a meter.

Data flow:
- Board reads upstream meters (RTU/TCP).
- Policy engine computes **virtual meter** values.
- Board exposes itself as a **Modbus meter slave/server** toward the inverter.
- Inverter reads those registers and applies its vendor zero-export/export-limit logic.

Key requirements:
- brand-specific virtual meter **profiles** (register maps + scaling + sign conventions)
- deterministic fail-safe when upstream data is stale/ambiguous

### Mode B — `sync_controller` (PV‑DG Sync Controller)

Goal: board actively commands inverter output.

Data flow:
- Board reads meters + inverter telemetry (RTU/TCP).
- Board computes PV limit / setpoint.
- Board writes power-limit commands to inverter(s) (profile decides percent vs kW and register map).

Key requirements:
- brand-specific command **profiles**
- write-enable safety gate + clamp/ramp + generator minimum-load protection

---

## 3) Alignment with existing local API contract

The firmware core already serializes payloads used by the controller API. When networking is added:
- expose the existing contract paths under `/api/*` as defined in `dynamic_zero_export/docs/local_api_contract.md`
- keep `/whoami` separate as an onboarding identity endpoint used before the full API is configured

