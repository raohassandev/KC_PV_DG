# PWA Data Services

The Dynamic Zero Export PWA uses local service layers for live status, history, connectivity, alerts, and session state.

Current implementation status:
- services are local-first and fixture-backed by default
- localStorage persistence is used when running in the browser
- the data contract is stable enough for a future live backend

Owner-facing data:
- plant power
- solar generation
- grid import/export
- generator contribution
- current system state
- alert count and friendly summaries
- Wi-Fi and LAN status

Installer/manufacturer data:
- commissioning summary
- topology and policy context
- connectivity diagnostics
- alert debug details
- profile/service data

Future live-backend work will replace the fixture sources without changing the page contracts.

