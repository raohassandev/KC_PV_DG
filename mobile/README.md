# PV-DG Commissioning (Expo)

- **Run:** `npm.cmd install` then `npm.cmd start` / `npm.cmd run android` on this Windows machine.
- **App:** Redux Toolkit, role-aware bottom tabs, AsyncStorage persistence, direct LAN HTTP to ESPHome (`usesCleartextTraffic` on Android).
- **Why Expo managed:** faster delivery than bare React Native; use prebuild / dev client when extra native behavior is needed.

## Android Studio On This PC

- Android Studio is installed at `C:\Program Files\Android\Android Studio`.
- Android SDK is installed at `C:\Users\ST\AppData\Local\Android\Sdk`.
- `adb.exe` works from `C:\Users\ST\AppData\Local\Android\Sdk\platform-tools\adb.exe`.
- No emulator/AVD was listed when checked. Create one in Android Studio Device Manager before using `npm.cmd run android` without a physical phone.
- PowerShell blocks `npm.ps1` / `npx.ps1` on this machine. Use `npm.cmd` / `npx.cmd`, or intentionally change PowerShell execution policy.

## Product UX Direction

The Android app should be a field-first commissioning and monitoring tool, not a cramped copy of every PWA page.

- **Owner/User:** live status, alarms, energy history, approved controls only.
- **Installer:** board setup, WiFi provisioning, site commissioning, validation, local export.
- **Support:** diagnostics, board probe, logs/status, guided support checks.
- **Manufacturer:** local commissioning authority, templates, driver library, full diagnostics.

## Test Credentials

The mobile app uses local test login:

| Role | Password |
| --- | --- |
| User | `DevUser!1` |
| Installer | `DevInstall!1` |
| Manufacturer | `DevMfg!1` |

Fleet/VPS features belong to the web app. Keep the mobile app focused on local field commissioning and local monitoring.

## Navigation Plan

- Keep **Live** as the first tab for every role.
- Keep **Account** visible so role/session can change.
- Show commissioning tabs only for installer/manufacturer roles.
- Support role should see diagnostics-oriented tabs, not full site editing by default.
- Avoid too many permanent bottom tabs for owner users.

## Realtime Monitoring Plan

Every configured site must define how the app monitors it:

- REST polling for current ESPHome boards and local LAN fallback.
- WebSocket from a future local controller API for realtime mobile updates.
- MQTT is not a direct mobile-app requirement; fleet MQTT stays in the web/gateway track.
- Screens must show transport mode, last update time, and stale/offline state.

## Current First-Pass UX Work

- Shared screen shell tightened for Android.
- Cards/buttons made denser and more field-tool friendly.
- Bottom tabs now change by role.
- Live dashboard now prioritizes plant snapshot, transport, and update status.
