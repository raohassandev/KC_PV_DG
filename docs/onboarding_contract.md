# PV‑DG Onboarding & Identity Contract (MVP)

This document defines the minimum HTTP endpoints and payloads used by the manufacturer PWA to commission a board **without an OLED**.

The contract is designed to support:
- AP-mode provisioning (board hosts Wi‑Fi AP)
- LAN discovery and selection (board is on site Wi‑Fi)
- consistent device identity for support/audit

---

## 1) Base URL

The PWA talks to the board using a base URL:
- AP mode: `http://192.168.4.1`
- LAN mode: `http://<board-ip>` or `http://<boardName>.local` (mDNS)

All endpoints below are relative to the base URL.

---

## 2) `GET /whoami`

Returns identity + capabilities for UI routing.

### Response (JSON)

```json
{
  "deviceName": "pv-dg-controller",
  "controllerId": "PV-DG-001122",
  "mac": "AA:BB:CC:DD:EE:FF",
  "ip": "192.168.4.1",
  "fwVersion": "2026.04.24",
  "capabilities": {
    "discovery": true,
    "apProvisioning": true,
    "syncMode": true,
    "dzxMode": false,
    "modbusRtu": true,
    "modbusTcp": true
  },
  "webUiUrl": "http://192.168.4.1/"
}
```

Notes:
- `controllerId` should be stable (serial/QR identifier).
- `dzxMode` indicates whether the firmware can serve the inverter as a meter (virtual meter / Modbus slave).

---

## 3) `POST /provision_wifi` (AP mode only)

Requests that the board join a Wi‑Fi network.

### Request (JSON)

```json
{ "ssid": "SiteWiFi", "password": "secret" }
```

### Response (JSON)

```json
{ "accepted": true, "jobId": "prov-1" }
```

---

## 4) `GET /provision_status` (AP mode only)

Used by the PWA to show progress and prompt the user to switch networks.

### Response (JSON)

```json
{
  "jobId": "prov-1",
  "state": "idle|connecting|connected|failed",
  "message": "Optional human-readable status"
}
```

---

## 5) Commissioning model additions (PWA → exported config)

### Controller mode (root requirement)

`controllerMode` is explicit:
- `dzx_virtual_meter`: board serves inverter as a meter (virtual meter); inverter self-curtails
- `sync_controller`: board writes power limit commands to inverter(s)

### Per-slot transport (mixed RTU + TCP)

Each slot has:
- `transport`: `rtu | tcp`
- `unitId` (Modbus slave/unit id)
- if `tcp`: `tcpHost`, `tcpPort`

The commissioning bundle must preserve these fields for audit/support, even if the current ESPHome YAML still needs explicit wiring per device.

