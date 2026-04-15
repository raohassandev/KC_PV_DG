# Current ESPHome System vs Dynamic-Zero-export System

Last updated: 2026-04-15

## 1. Summary

This repository now carries two intentionally separate product directions:

- **Current system**: ESPHome-based modular firmware under `Modular_Yaml` with a React + TypeScript + Vite PWA under `PWA`.
- **Future system**: a custom-firmware path planned under the branch name `dynamic-Zero-export`.

They are related, but they are not the same firmware strategy.

## 2. Current system

The current system:
- uses ESPHome firmware
- requires burning ESPHome firmware onto the controller board
- keeps the modular firmware layout in `Modular_Yaml`
- uses the PWA as the commissioning and monitoring UI
- uses the ESPHome web server as the board bridge

Current system scope:
- live board telemetry
- current grid-centric control modes
- board enable / write toggles
- site commissioning profiles
- YAML bundle export

Current system is still the supported lab-verified path.

## 3. Future system

The future system:
- uses custom firmware on the ESP32
- does **not** require ESPHome firmware
- uses a virtual-meter architecture
- lives in the separate branch `dynamic-Zero-export`
- is intended to let the controller read a real meter upstream and emulate a meter downstream toward the inverter

Future system scope:
- Modbus RTU and Modbus TCP meter input
- virtual meter output toward inverter
- topology-aware policy engine
- generator minimum load protection
- reverse protection assist
- brand-specific meter emulation profiles

## 4. Why both exist

The current ESPHome path is the practical working baseline.
The dynamic-Zero-export path is the next-generation architecture for more flexible site policy handling.

The repository must keep both paths clear:
- current path for today’s working system
- future branch for the custom virtual-meter system

## 5. Key difference

### ESPHome path
- board behavior is described in YAML
- the board is flashed with ESPHome firmware
- the PWA configures and monitors the board

### dynamic-Zero-export path
- board behavior is implemented in custom firmware
- the controller reads real meter data directly
- the controller emulates the meter the inverter expects
- the inverter performs native export-limiting or zero-export behavior

## 6. Migration boundary

Do not merge the two paths into one ambiguous architecture.

The current ESPHome path remains intact.
The future custom-firmware path is a separate branch plan and codebase direction.

## 7. Branch strategy

Recommended branch name:

- `dynamic-Zero-export`

This branch should contain:
- custom firmware architecture
- virtual meter policy engine
- protocol adapters
- LAN/WiFi monitoring API
- commissioning schema and UI updates for the new path

## 8. Operational note

The current ESPHome system is still valid for lab and current deployment work.
The dynamic-Zero-export system is a planned extension, not a replacement in this repository state.

