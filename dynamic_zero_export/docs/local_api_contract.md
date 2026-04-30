# Dynamic Zero Export Local API Contract

This contract is the first LAN-first bridge between the firmware core and commissioning clients.
It is local-controller focused and does not require cloud services.

Implemented endpoints / payload groups:
- `/api/device/info`
- `/api/live-status`
- `/api/topology`
- `/api/connectivity`
- `/api/alerts`
- `/api/history`
- `/api/commissioning-summary`
- `/api/config-review`
- `/api/session`

Mutable local endpoints:
- `POST /api/provider-mode`
- `POST /api/connectivity/settings`
- `POST /api/alerts/ack`
- `POST /api/sim/live-status`
- `POST /api/sim/connectivity`
- `POST /api/sim/alerts`
- `POST /api/sim/history-append`

Notes:
- The API simulator is a development bridge and fixture source.
- The firmware core serializes the same shape for future embedded networking.
- No production ESP32 networking is implemented yet.
