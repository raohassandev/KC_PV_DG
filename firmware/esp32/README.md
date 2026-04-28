# PV-DG Controller (Custom Firmware) — ESP32 / ESP-IDF

This replaces the ESPHome firmware with a custom ESP-IDF application.

## Requirements
- ESP-IDF installed (v5.x recommended)
- USB serial driver for your ESP32 board

## macOS setup (zsh)
If `idf.py` is not found, it means ESP-IDF isn’t activated in your shell session.

- **Option A (recommended): Espressif ESP-IDF installer**
  - Install ESP-IDF with the official installer.
  - Then in a terminal, activate the environment (path varies; installer prints it). Typical:

```bash
source "$HOME/esp/esp-idf/export.sh"
idf.py --version
```

- **Option B: esp-idf via git**

```bash
mkdir -p "$HOME/esp" && cd "$HOME/esp"
git clone --recursive https://github.com/espressif/esp-idf.git
cd esp-idf
./install.sh esp32
source ./export.sh
idf.py --version
```

### USB / serial port quick checks

```bash
ls /dev/cu.* | head
```

Common ports: `/dev/cu.usbserial-*`, `/dev/cu.SLAB_USBtoUART`, `/dev/cu.wchusbserial*`.

## Build & flash
From repo root:

```bash
cd firmware/esp32
idf.py set-target esp32
idf.py menuconfig
idf.py build flash monitor
```

### If flash can’t find the port
Specify it explicitly:

```bash
idf.py -p /dev/cu.usbserial-XXXX flash monitor
```

### Notes
- First boot starts **STA** if credentials exist in NVS, otherwise **SoftAP** at `192.168.4.1`.
- SoftAP password default is currently set in `main/app_config.h` (`PVDG_SOFTAP_PASSWORD`).

## API
- `GET /whoami` → device identity + capabilities (JSON)

