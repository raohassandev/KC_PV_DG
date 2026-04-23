# Dynamic Zero Export API Simulator

This is a stateful LAN-first local device-service starter for the PWA during development.

Run from `dynamic_zero_export`: `npm run sim` (listens on port **8787** by default; set `PORT` to override).

It is not the firmware and not a device runtime.
It serves the shared local API contract over HTTP and can persist mutable state to a local JSON file.

Supported actions:
- provider mode selection
- connectivity settings updates
- alert acknowledgement
- live status simulation
- connectivity simulation
- alerts simulation
- history append for development

Persistence:
- local JSON file state under `state/device-state.json`
- fixtures remain the default seed source
