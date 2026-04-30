# PV-DG Commissioning (Android)

Expo/React Native field app for the custom ESP32 PV-DG controller firmware.

## Run On This Windows Machine

```powershell
npm.cmd install
npm.cmd start
```

Use `npm.cmd` / `npx.cmd` in PowerShell on this PC.

## Local Tooling Notes

- Android Studio: `C:\Program Files\Android\Android Studio`
- Android SDK: `C:\Users\ST\AppData\Local\Android\Sdk`
- ADB: `C:\Users\ST\AppData\Local\Android\Sdk\platform-tools\adb.exe`

## App Scope

- Probe the custom controller API.
- Pair with the controller.
- Provision Wi-Fi.
- Save/load site config locally through the controller.
- Monitor live values from `/telemetry/snapshot`.
- Show diagnostics and stale/offline status.

## Test Credentials

| Role | Password |
| --- | --- |
| User | `DevUser!1` |
| Installer | `DevInstall!1` |
| Manufacturer | `DevMfg!1` |

Fleet/VPS features are not the Android app's primary scope on this branch.
