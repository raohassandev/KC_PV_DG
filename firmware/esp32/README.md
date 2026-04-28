# PV-DG Controller (Custom Firmware) — ESP32 / ESP-IDF

This replaces the ESPHome firmware with a custom ESP-IDF application.

## Requirements
- ESP-IDF installed (v5.x recommended)
- USB serial driver for your ESP32 board

## Build & flash
From repo root:

```bash
cd firmware/esp32
idf.py set-target esp32
idf.py menuconfig
idf.py build flash monitor
```

## API
- `GET /whoami` → device identity + capabilities (JSON)

