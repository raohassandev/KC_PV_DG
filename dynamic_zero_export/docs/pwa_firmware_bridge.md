# PWA to Firmware Bridge

The Dynamic Zero Export PWA now has a shared local API contract with the firmware core.

Status:
- Real contract shapes exist.
- Firmware core can serialize live snapshots to the agreed shapes.
- PWA services can consume API-backed data or fall back to local persistence/fixtures.
- The simulator provides a local development endpoint set.

What is simulated:
- local HTTP transport
- fixture-backed responses
- provider fallback behavior

What is real:
- shared JSON contract
- firmware-core serialization bridge
- PWA adapter interfaces

