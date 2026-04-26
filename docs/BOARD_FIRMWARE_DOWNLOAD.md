# Board firmware: download and build (handoff for agents)

This document tells another agent or engineer **how to get controller firmware** for the PV-DG project. It reflects how **this repository** is structured today (2026).

**Produce firmware files in one place:** from repo root run **`./scripts/export_pv_dg_firmware.sh`**. It runs `esphome compile` and copies `firmware.bin`, `firmware.factory.bin`, `firmware.ota.bin`, and related images into **`Modular_Yaml/firmware-out/`** (binaries are gitignored; **`Modular_Yaml/firmware-out/README.md`** stays in git).

**Quick serial check (automated):** run **`./scripts/esp_serial_probe.sh`**. It lists `/dev/cu.*` and runs `esptool chip_id` on each likely USB-UART port.

---

## 1. Critical fact: there is no checked-in binary release

- The repo does **not** ship a ready-made `.bin` / `.factory.bin` download URL for field use.
- **Supported path today** is **ESPHome**: firmware is **compiled locally** (or in CI you add yourself) from YAML under **`Modular_Yaml/`**.
- **`dynamic_zero_export/firmware_core/`** is **C++17 host code** for a future custom ESP32 firmware; it is **not** a finished flashable image. See `dynamic_zero_export/firmware_core/README.md`.

If a stakeholder asks for “the firmware download link,” the accurate answer is: **build from this repo’s ESPHome config (or publish artifacts from your own pipeline).**

---

## 2. Hardware target (current ESPHome baseline)

- Board family referenced in project docs: **KC868-A6 / ESP32** (`esp32dev` in YAML).
- Canonical modular layout: **`Modular_Yaml/base_board.yaml`** and included packages.
- **Primary device config** to compile/run: **`Modular_Yaml/pv-dg-controller.yaml`**.

Secrets (Wi-Fi, API encryption, OTA, etc.) are **not** in git. Use team-supplied secrets or **`CREDENTIALS.local.example`** at repo root as a template pattern.

---

## 3. How to produce a firmware binary (ESPHome)

Prerequisites: [ESPHome](https://esphome.io/) installed on the machine (`esphome` CLI in `PATH`).

From repo root (adjust serial port):

```bash
# Compile only — produces build tree under ~/.esphome/build/<node>/
esphome compile Modular_Yaml/pv-dg-controller.yaml
```

Typical **flash over USB** (macOS/Linux serial device varies):

```bash
esphome run Modular_Yaml/pv-dg-controller.yaml --device /dev/cu.usbserial-XXXX
```

Examples that appear in repo `ReadMe.md` (historical device names — replace path and port):

```text
esphome run Modular_Yaml/pv-dg-controller.yaml --device /dev/cu.usbserial-1110
```

After `compile`, ESPHome prints where the **merged firmware** artifacts live. For **`Modular_Yaml/pv-dg-controller.yaml`** (device name `pv-dg-controller`), builds land under the repo:

```text
Modular_Yaml/.esphome/build/pv-dg-controller/.pioenvs/pv-dg-controller/
```

Useful outputs (after a successful compile):

| File | Typical use |
|------|-------------|
| `firmware.factory.bin` | Full flash at **0x0** (USB / esptool “factory” style image when produced) |
| `firmware.bin` | Application image (OTA / upload) |
| `firmware.ota.bin` | Copy produced for ESPHome OTA flows |

**Flash onto the board over USB** (replace the serial port; macOS often `cu.usbserial-*` or `cu.usbmodem*`):

```bash
cd /path/to/KC_PV_DG
esphome run Modular_Yaml/pv-dg-controller.yaml --device /dev/cu.usbserial-XXXX
```

`esphome run` compiles if needed, uploads, and starts the serial log. Put the ESP32 in **bootloader mode** if the upload fails (hold BOOT, tap EN, release BOOT — exact pins vary by board).

### Upload troubleshooting: `Failed to connect to ESP32: No serial data received`

The firmware **built successfully**; esptool could not talk to the ROM bootloader on the UART. Work through this list:

1. **Correct port** — On macOS run `ls /dev/cu.*` with the cable plugged in; unplug and replug to see which device appears. Another app (serial monitor, another `esphome logs`, Arduino IDE) must **not** hold the port open.
2. **Data-capable USB cable** — Charge-only cables are common; swap cable and USB port (prefer direct to the Mac, not an unpowered hub).
3. **USB–serial driver** — Many KC868 / ESP32 boards use **CP210x** or **CH340**; install the vendor driver if the port exists but never answers.
4. **Manual download mode** — Hold **BOOT** (GPIO0 low), press **RESET/EN**, release **RESET**, then release **BOOT** a second later; run `esphome run` immediately. Exact labels vary (`IO0`, `FLASH`, etc.); use the **board vendor** diagram for KC868-A6.
5. **Retry esptool’s suggested flags** — ESPHome often prints a long `esptool ... write-flash ...` line; run it once by hand after step 4. Lower baud if needed: `--baud 115200` (already retried automatically in some versions).
6. **Power** — Some boards need external supply while flashing; check whether USB alone is specified for programming.

If the device **already runs ESPHome on Wi‑Fi**, prefer **OTA** (`esphome upload` / dashboard) to avoid USB bootloader issues.

---

## 4. OTA (over-the-air)

`Modular_Yaml/base_board.yaml` includes:

```yaml
ota:
  - platform: esphome
```

So **ESPHome OTA** is intended once the device is already on the network with matching `secrets`. Standard ESPHome OTA workflows apply (`esphome upload` / dashboard OTA). This repo does not automate OTA from the PWA yet.

---

## 5. Relationship to the PWA

- The **PWA** commissions the site and can **export** a deployable YAML bundle (`siteBundleGenerator` / YAML Export in-app). That export is meant to align with **`Modular_Yaml`** patterns, not to replace the need for ESPHome to compile firmware.
- **Live board HTTP** (telemetry, toggles) is separate from **DZX simulator API** under `dynamic_zero_export/api_simulator`. Do not confuse **board IP** (ESPHome `web_server`) with **`dzx.apiBaseUrl`** for the Monitoring shell. See **`docs/PWA_MONITORING_AND_GATEWAY.md`**.

---

## 6. Future custom firmware (Dynamic Zero Export core)

- Location: **`dynamic_zero_export/firmware_core/`**
- Status: **host-buildable** (`CMake`), tests on PC; **not** production ESP-IDF image.
- Build (from that directory, if extending):

```bash
cd dynamic_zero_export/firmware_core
cmake -S . -B build && cmake --build build
```

There is **no** “download firmware” artifact from this subtree until an ESP32 port and release pipeline exist.

---

## 7. Related docs (read order for agents)

| Doc | Purpose |
|-----|---------|
| `docs/KC_PV_DG_Handover.md` | Board vs app status, EM500 notes, bottlenecks |
| `docs/current-esphome-vs-dynamic-zero-export.md` | Two product directions (ESPHome vs DZX custom FW) |
| `docs/onboarding_contract.md` | Target HTTP contract for future unified onboarding |
| `docs/PWA_MONITORING_AND_GATEWAY.md` | PWA operation vs DZX API vs board |

---

## 8. Checklist for an agent asked to “get firmware on a board”

1. Confirm **which path**: current **ESPHome** (`Modular_Yaml`) vs experimental **firmware_core** (almost certainly not for field yet).
2. Install **ESPHome**, copy **secrets** for Wi-Fi / API / OTA.
3. Run **`esphome compile Modular_Yaml/pv-dg-controller.yaml`** and locate output artifacts.
4. Flash with **`esphome run ... --device <serial>`** or use **OTA** if the device is already provisioned.
5. Verify **HTTP**: `http://<board-ip>/json` or entity endpoints per `docs/KC_PV_DG_Handover.md` and `PWA/src/boardDiscovery.ts`.

If you add a **public or private firmware artifact store** (GitHub Releases, S3, etc.), append that policy here so the next agent does not assume binaries live in the git tree.
