# Offline / LAN-only commissioning guide

This guide documents how to commission a site **without internet** (LAN-only), and what parts of the system require a gateway vs can run directly against the controller.

## What works without any gateway

- **Connect to Controller** (Site Setup / Connect):
  - The PWA can connect **directly** to the controller over HTTP using:
    - `http://<board-ip>` (preferred)
    - `http://<board-name>.local` (mDNS, if the network supports it)
    - `http://192.168.4.1` (setup/AP mode)
- **Live status (Dashboard)**:
  - Reads controller entities over HTTP (ESPHome web_server endpoints and fallbacks).
- **YAML bundle generation**:
  - Runs in-browser (no gateway required).

### What you must have

- Your phone/laptop and the controller are on the **same Wi‑Fi network**.
- You know (or can discover) the **controller IP** (router DHCP list is the most reliable).

## What needs a gateway (not available offline unless gateway is on-site)

- **Driver Library (Manufacturer drivers)** persistence (`/api/drivers/*`).
- **Fleet site storage** (load/save commissioning profile to `sites/<siteId>.json` on the gateway).
- **LAN scan helper**:
  - `/api/board/scan` (gateway scans local subnets; browsers cannot)
  - `/api/board/probe` (gateway proxy used to avoid some keep-alive stalls)

## LAN scan/probe safety model (important for VPS)

The gateway has LAN-only helper endpoints:

- `GET /api/board/scan`
- `GET /api/board/probe`

These are **disabled by default in VPS/public deployments** via:

- `KC_PVDG_PUBLIC_MODE=1` (default): **scan/probe disabled** (returns 403)
- `KC_PVDG_PUBLIC_MODE=0`: scan/probe enabled (use only on a trusted LAN/edge host)

The PWA already treats gateway scanning as **best-effort** and falls back to direct probing and setup/AP mode.

## Recommended offline commissioning workflow (no gateway)

1. Power the controller and connect it to the site Wi‑Fi (or use setup/AP mode first).
2. Find the controller IP from the router DHCP leases (preferred).
3. Open the PWA and go to **Commissioning → Site Setup → Connect to Controller**.
4. Enter the controller IP (or name) and tap **Connect**.
5. Complete slots/topology and generate the YAML bundle.

## Optional: running an on-site “edge gateway” (advanced)

If you want **auto LAN scanning** and local driver persistence while offline:

- Run the gateway on a laptop/installer PC connected to the same LAN as the controller.
- Set `KC_PVDG_PUBLIC_MODE=0` for that edge gateway.

This is intentionally separate from the VPS gateway because a VPS cannot (and should not) scan customer LANs.

