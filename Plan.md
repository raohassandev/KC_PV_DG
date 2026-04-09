# PV-DG Smart Controller (ESPHome + KC868-A6)

---

# 📌 1. Project Overview

Hybrid power controller for:

* Grid
* 2 × Generators
* Solar inverter

### 🎯 Goals

* Zero export / limited export / limited import
* Generator load stabilization
* Solar inverter dynamic control via Modbus

---

# 🧰 2. Hardware (KC868-A6)

## Controller Board

* Model: **KC868-A6**
* MCU: ESP32
* 6 Relays (via PCF8574)
* 6 Digital Inputs
* RS485 onboard
* I2C expanders

## 📍 Pin Mapping (CRITICAL)

### RS485

| Signal | GPIO   |
| ------ | ------ |
| TX     | GPIO27 |
| RX     | GPIO14 |

### I2C

| Signal | GPIO   |
| ------ | ------ |
| SDA    | GPIO4  |
| SCL    | GPIO15 |

### PCF8574

| Function | Address |
| -------- | ------- |
| Outputs  | 0x24    |
| Inputs   | 0x22    |

---

# 🔌 3. Wiring

## RS485 Bus

All devices on same bus:

```
ESP32 (A/B)
   ├── Grid Meter (ID=1)
   ├── Gen1 Meter (ID=2)
   ├── Gen2 Meter (ID=3)
   └── Solar Inverter (ID=10)
```

### ⚠️ Important

* A ↔ A
* B ↔ B
* Common GND recommended
* Use termination resistor (120Ω)

---

# 🔗 4. Resources / References

## ESPHome

* [https://esphome.io/](https://esphome.io/)
* [https://esphome.io/components/modbus_controller.html](https://esphome.io/components/modbus_controller.html)
* [https://esphome.io/components/web_server.html](https://esphome.io/components/web_server.html)
* [https://esphome.io/components/logger.html](https://esphome.io/components/logger.html)

## PlatformIO (used internally)

* [https://platformio.org/](https://platformio.org/)

## Modbus Tools

* Modbus Poll / QModMaster (testing registers)

## Energy Meter (EM500)

* Register map (from project PDF)
* Key registers:
  * Total Power → `0x003A`
  * Frequency → `0x0032`
  * Energy → `0x1B20`

## Solar Inverter (Huawei)

* Key registers:
  * Actual Power → `32080`
  * Pmax → `30083`
  * Control Power → `40120`
  * Remote scheduling → `42014`
  * Gradient → `42017`
  * Fail-safe → `42075–42077`

---

# ⚙️ 5. Software Stack

* ESPHome (firmware)
* ESP-IDF framework
* Modbus RTU (RS485)
* Web UI (ESPHome Web Server v3)

---

# 📊 6. Measurements

## Grid

* L1, L2, L3 Power
* Total Power
* Frequency
* Import / Export Energy

## Generators

* Power (Gen1, Gen2)
* Energy

## Solar

* Actual Power
* Command Power
* PV %

---

# 🧠 7. Control Logic

## Modes

### Disabled

* Monitoring only

### Grid Zero Export

* Grid = 0 kW

### Limited Export

* Grid ≥ -limit

### Limited Import

* Grid ≤ limit

### Generator Hold

* Maintain generator load
* Solar absorbs changes

---

# 📈 8. Algorithm

```
error = target - measured
if abs(error) < deadband → ignore

delta% = (error / PV_Rated) × gain

limit delta% by ramp

PV% = previous + delta%

clamp PV%

PV_kW = PV% × PV_Rated
```

---

# ⚡ 9. Key Settings

| Setting        | Purpose         |
| -------------- | --------------- |
| PV Rated       | Solar capacity  |
| Gain           | Response speed  |
| Deadband       | Noise filter    |
| Ramp Normal    | Fast response   |
| Ramp Generator | Slow response   |
| Export Limit   | Grid export cap |
| Import Limit   | Grid import cap |
| Generator Hold | DG target load  |

---

# 🖥️ 10. UI Structure

### Groups

* Live Power
* Energy Stats
* Controller Settings
* Solar Inverter
* Installer / Service
* I/O
* Debug

---

# 🧪 11. Debug System

## Default

* WARN level (low CPU)

## Buttons

* Debug ON
* Debug INFO
* Debug WARN

---

# 🚀 12. Deployment

## Compile

```bash
esphome config huawei-rozwell.yml
```

## USB Upload

```bash
esphome run huawei-rozwell.yml --device /dev/cu.usbserial-xxxx
```

## OTA

```bash
esphome run huawei-rozwell.yml
```

---

# ⚠️ 13. Troubleshooting

## NA Values

* Check Modbus ID
* Check wiring
* Check baud rate

## Upload Fail (Mac)

* Remove spaces in path

## No Relay Output

* Check PCF8574 address
* Check inverted logic

## Wrong Data

* Register scaling issue
* Wrong register type

---

# 🔮 14. Future Improvements

* Phase balancing
* Adaptive control gain
* Multi-site monitoring
* SCADA dashboard
* AI load prediction

---

# 🧾 15. Summary

This system provides:

✅ Smart solar control
✅ Generator optimization
✅ Grid compliance
✅ Scalable architecture

---

# 📎 Use Cases

* Industrial plants
* Fuel stations
* Hybrid energy systems

---

# 🔚 End
