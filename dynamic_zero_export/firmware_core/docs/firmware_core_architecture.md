# Firmware Core Architecture

The firmware core is split into:
- configuration
- interfaces
- topology
- source detection
- virtual meter generation
- controller loop
- monitoring
- simulation
- serialization bridge

The core is intentionally host-buildable first. The ESP32-specific layer will sit on top of this core later and provide:
- meter transports
- inverter output transport
- Wi-Fi/network status
- local storage backend
- logging/event forwarding

