# Dynamic Zero Export Local API Contract

This contract is the first LAN-first bridge between the firmware core and the PWA.
It is local-controller focused and does not require cloud services.

Implemented endpoints / payload groups:
- `/api/device`
- `/api/live-status`
- `/api/topology`
- `/api/connectivity`
- `/api/alerts`
- `/api/history`
- `/api/commissioning`
- `/api/config-review`
- `/api/session`

Notes:
- The API simulator is a development bridge and fixture source.
- The firmware core serializes the same shape for future embedded networking.
- No production ESP32 networking is implemented yet.

