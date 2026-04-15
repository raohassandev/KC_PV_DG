# Dynamic Zero Export Firmware Core

This subtree is a host-buildable C++17 starter for the future custom-firmware branch.

Status:
- real code, not planning text
- host-buildable with CMake
- testable on the development machine
- not yet ESP32/ESP-IDF production firmware

Implemented:
- config model bridge
- controller state machine
- policy evaluation loop
- source detection
- topology handling
- virtual meter generation
- alarm/event model
- monitoring snapshot builder
- mock interfaces for host testing

Later work:
- ESP32 transport integration
- Modbus RTU/TCP clients
- inverter-facing slave/server
- persistent storage backends
- Wi-Fi / network runtime integration

