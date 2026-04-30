# KC PV-DG

Custom PV-DG controller firmware and Android commissioning app.

## Current Direction

- `firmware/esp32/` is the board firmware track.
- `mobile/` is the Android commissioning and monitoring app.
- `dynamic_zero_export/` keeps the policy/runtime model and tests.
- EM500/Rozwell grid meter support is implemented in the custom firmware path.

The old ESPHome firmware and PWA product path have been removed from this branch.

## Build Firmware

From repo root:

```bash
cd firmware/esp32
idf.py set-target esp32
idf.py build flash monitor
```

On Windows, use the ESP-IDF PowerShell or command prompt so `idf.py` is available.

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
