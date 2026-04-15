# Firmware Core Status

This subtree is the first real C++ firmware-core starter for Dynamic Zero Export.

Implemented:
- C++17 host-buildable core
- config model bridge
- policy loop
- controller state machine
- source detection
- topology derivation
- virtual meter generation
- monitoring snapshot builder
- mock interfaces and simulation helpers
- host tests

Not yet implemented:
- ESP32/ESP-IDF integration
- hardware Modbus RTU/TCP transports
- production inverter-facing slave/server
- persistent flash/NVS storage
- real Wi-Fi/network runtime glue

