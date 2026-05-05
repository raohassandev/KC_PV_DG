# KC PV-DG

Custom PV-DG controller firmware and Android commissioning app.

## Current Direction

- `firmware/esp32-s3/` is the ESP32-S3 board firmware track.
- `mobile/` is the Android commissioning and monitoring app.
- `dynamic_zero_export/` keeps the policy/runtime model and tests.
- EM500/Rozwell grid meter support is implemented in the custom firmware path.

The old ESPHome firmware and PWA product path have been removed from this branch.

## Build Firmware

From repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\flash_esp32s3.ps1 -Port COMx -Monitor
```

On Windows, use the ESP-IDF PowerShell or command prompt so `idf.py` is available. Omit `-Port` to auto-detect a single connected ESP USB serial port.

## Run Android App

```powershell
cd mobile
npm.cmd install
npm.cmd start
```

Use Android Studio or a physical Android device with USB debugging enabled.

## Verify

```powershell
npm.cmd run verify
```
