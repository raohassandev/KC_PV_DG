# Local Device Service

The API simulator is now a stateful local device-service starter.

What it does now:
- serves live status, topology, connectivity, alerts, history, commissioning, and config-review snapshots
- supports safe local mutations for development and commissioning flow work
- persists state to a local JSON file when used from the host runtime

What it is not yet:
- final ESP32 embedded networking
- production device firmware
- cloud-connected service

