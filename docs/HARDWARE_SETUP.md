# Mini PV Controller — ESP32-S3 Hardware Setup Guide

**Version:** 1.0  
**Target Board:** ESP32-S3 DevKitC-1 (16MB Flash, 8MB PSRAM)  
**Date:** 2026-05-02

---

## 1. GPIO Pin Assignment

### ESP32-S3 Pinout (LQFP-100)

```
                      ┌─────────────────────┐
                      │   ESP32-S3-WROOM   │
                      │   DevKitC-1        │
                      └─────────────────────┘

=== UART0 (Grid Meter / EM500) ===
GPIO 43  ← TX (UART0) to grid meter
GPIO 44  ← RX (UART0) from grid meter
GPIO 2   ← RE/DE (RS485 driver enable)

=== UART1 (Inverter 1) ===
GPIO 17  ← TX (UART1) to inverter 1
GPIO 18  ← RX (UART1) from inverter 1
GPIO 21  ← RE/DE (RS485 driver enable)

=== UART2 (Optional: Inverter 2 or Meter 2) ===
GPIO 19  ← TX (UART2)
GPIO 20  ← RX (UART2)
GPIO 11  ← RE/DE (RS485 driver enable)

=== SPI (Ethernet optional, W5500) ===
GPIO 12  ← MOSI (SPI MOSI)
GPIO 13  ← MISO (SPI MISO)
GPIO 14  ← CLK (SPI clock)
GPIO 15  ← CS (SPI chip select)
GPIO 16  ← INT (Interrupt, unused in phase 1)

=== I2C (Sensor bus, future) ===
GPIO 8   ← SDA (I2C data)
GPIO 20  ← SCL (I2C clock)

=== Status / LED ===
GPIO 46  ← Status LED (WiFi connected)
GPIO 0   ← Button (reset on long press, future OTA trigger)

=== Reserved / Not Used ===
GPIO 1, 3, 4, 5, 6, 7  ← SPI flash (do not use)
GPIO 9, 10             ← External flash (do not use)
GPIO 37, 38            ← Crystal oscillator (do not use)
GPIO 39, 40            ← USB (do not use)
GPIO 41, 42            ← USB (do not use)
```

---

## 2. RS485 Hardware Wiring

### Multi-Device Architecture (Slave ID Based)

Instead of dedicated channels per device, the Mini PV Controller uses **Modbus slave addressing**. Multiple meters and inverters can share the same RS485 bus by assigning unique slave IDs (1-247).

**Phase 1 (Single RS485 Bus):**
- Grid meter (Slave ID 1) + Inverter (Slave ID 2) on **same port**
- Simpler wiring, no cable duplication
- Risk: Single point of failure (EMI could disconnect all devices)

**Phase 1+ (Dual RS485 Option):**
- Port A: Grid meters (Slave ID 1-50)
- Port B: Inverters (Slave ID 1-50, separate namespace)
- Benefit: Isolation (noise from inverter doesn't affect meter readings)
- Production recommendation if site has long cables or noisy environment

**Alternative: Modbus TCP/IP**
- Instead of RS485 Port B: Use Ethernet gateway (PUSR DR302 or similar)
- Fallback for sites where RS485 is unavailable
- Adds ~50-100ms latency compared to RTU
- Config: Dynamic per-device (firmware selects RTU or TCP at runtime)

### MAX485 Module Wiring (Single Port Example)

**Phase 1: Grid Meter + Inverter on Same RS485 Bus**

```
┌─────────────────────┐
│   MAX485 Module     │
│ (DIP-8 or SMD)      │
└─────────────────────┘

VCC (5V)  ← Power supply (buck converter)
GND       ← Common ground
DI        ← GPIO 43 (UART0 TX)
RO        ← GPIO 44 (UART0 RX)
DE        ← GPIO 2 (Driver enable)
RE        ← GPIO 2 (Receiver enable, tied to DE)
A         ← RS485 BUS A
B         ← RS485 BUS B

RS485 BUS:
  ┌─ Meter (Slave ID 1) ─┐
  │ A → MAX485 A          │
  │ B → MAX485 B          │
  └───────────────────────┘
  
  ┌─ Inverter (Slave ID 2) ─┐
  │ A → MAX485 A             │
  │ B → MAX485 B             │  (connected in parallel)
  └──────────────────────────┘
  
  ┌─ Terminator (120Ω) ─┐
  │ Between A and B     │
  │ ONLY at end device! │
  └─────────────────────┘
```

**Phase 1+ (Optional: Dual RS485 for Isolation)**

If noise observed (CRC errors >1% on meter readings), add second MAX485:

```
UART0 (Port A) → MAX485-A → Grid Meters (Slave ID 1-50)
UART1 (Port B) → MAX485-B → Inverters (Slave ID 1-50, separate)
```

### RS485 Cable Specifications

```
Physical Layer:
├─ Cable Type: Shielded Twisted Pair (STP) or UTP Category 5e
├─ Gauge: 18 AWG (0.82mm²) for max 1200m, or 22 AWG for <100m
├─ Impedance: 100-120Ω nominal
├─ Max Length: 1200m (typical home: <50m)
├─ Baud Rate: 9600 bps (standard for EM500 & most inverters)
│
Cable Connections:
├─ Pair 1: A (white/red) — RS485 signal high
├─ Pair 2: B (green/black) — RS485 signal low
├─ Shield: —— Grounded at controller side ONLY (star point)
└─ Unused pairs: Twisted together, not terminated
```

### Typical Wiring Layout

```
┌─ Equipment Layout ─────────────────────────┐
│                                             │
│ AC Panel (230V / 3-phase):                 │
│   ├─ Grid Meter (EM500)                   │
│   │   └─ RS485 A/B ──┐                    │
│   │                  │ (Shielded pair,    │
│   ├─ Inverter (Huawei 5KW)                │ <50m typical)
│   │   └─ RS485 A/B ──┤                    │
│   │                  └──→ Combiner Box    │
│   │                       └─ Cable Gland  │
│   │                          │ (shielded) │
│   └─ Generator (optional)    │            │
│                              ▼            │
│                        ┌──────────┐       │
│                        │ MAX485   │       │
│                        │ Module   │       │
│                        │ Ch A & B │       │
│                        └──────────┘       │
│                              ▲            │
│       ┌─────────────────────┤ UART0,1   │
│       │                     │            │
│   [ESP32-S3]                │            │
│   Mounted in                │            │
│   weatherproof box          │            │
│   (DIN rail inside)         │            │
│                             │            │
│       ┌─ Power Supply ──────┘            │
│       │ (5V 2A for ESP32-S3+MAX485)     │
│       │ (Optional: 24V for sensors)     │
│       ▼                                  │
│   [24V or 12V DC PSU]                   │
│   with 5V buck converter                │
│                                          │
└──────────────────────────────────────────┘
```

---

## 3. Power Supply

### ESP32-S3 Power Requirements

```
Typical Power Draw:
├─ CPU idle: ~80 mA (WiFi OFF)
├─ WiFi active (TX): ~200 mA
├─ All UARTs active: ~120 mA
├─ Full load (2×UART + WiFi + HTTP): ~300-350 mA
└─ Peak (Modbus burst + WiFi TX): ~400 mA

Recommended PSU:
├─ Input: 12V or 24V DC (from AC/DC converter)
├─ Buck Converter: 12V/24V → 5V @ 2-3A
│  (Example: LM2596 module, <$2)
├─ Decoupling: 100µF capacitor on 5V rail
└─ 3.3V Regulator: Built-in on DevKitC-1 (260mA max)

Backup/UPS (Optional):
├─ Supercap bank (22F @ 5V) for clean shutdown
└─ OR: Small LiPo battery + charging circuit
```

### MAX485 Power

```
VCC (5V rail):
├─ MAX485 quiescent: ~1 mA
├─ Terminator resistor (120Ω): <1 mA at logic levels
└─ Budget: 5-10 mA additional per module

Isolation (Optional):
├─ Opto-isolated MAX485 variant (more cost)
├─ Reduces noise from long cable runs
└─ Use if observing random data errors
```

---

## 4. Temperature Sensors (Phase 2+)

### String Temperature Monitoring

**Option 1: DS18B20 (1-Wire) — Recommended for Phase 1**

```
One-wire bus on GPIO 25 (configurable):

   ┌──────────────┐     ┌──────────────┐
   │   DS18B20    │     │   DS18B20    │
   │  (Sensor 1)  │     │  (Sensor 2)  │
   │   VDD/GND    │     │   VDD/GND    │
   └──────┬───────┘     └──────┬───────┘
          │ DQ (data line)     │
          └─────────┬──────────┘
                    │
              ┌─────┴─────┐
              │ 4.7kΩ     │ (pull-up)
              │           │
         ESP32-S3          │
         GPIO 25 ──────────┴──→ +3.3V
```

**Option 2: I2C Sensor Hub (TMP117) — For Future**

```
I2C Bus (GPIO 8 SDA, GPIO 20 SCL):
                ┌──────────────┐
                │   TMP117     │
                │   I2C Temp   │
                │   Sensor     │
                └──────┬───────┘
                       │
         ┌─────────────┼─────────────┐
         │             │ SDA/SCL     │
    ESP32-S3       4.7kΩ pull-ups   │
    GPIO 8 (SDA)                    │
    GPIO 20 (SCL)                   │
         │             │            │
         └─────────────┴────────────┘
                     +3.3V
```

**Option 3: Inverter Native (Preferred)**
- Most modern inverters expose string temps via Modbus
- No extra hardware needed
- Implement brand-specific register mapping

---

## 5. Assembly Checklist

### BOM (Bill of Materials)

| Component | Qty | Cost (USD) | Notes |
|---|---|---|---|
| ESP32-S3 DevKitC-1 | 1 | $18 | Main controller |
| MAX485 RS485 Module | 2 | $4 | One per UART channel |
| Shielded Twisted Pair Cable | 50m | $15 | RS485 networking |
| 120Ω Terminators | 4 | $2 | RS485 bus ends |
| 5V / 2A Buck Converter | 1 | $3 | Power supply |
| DIN Rail Housing | 1 | $20 | Weatherproof enclosure |
| Ferrule Connectors | 50 | $5 | Cable termination |
| M3 Hardware (screws/nuts) | 1 set | $3 | Assembly |
| 100µF Electrolytic Cap | 2 | $1 | Decoupling |
| **Total** | | **~$71** | Dev board cost |

### Assembly Steps

1. **PCB/Breadboard Layout**
   - Mount ESP32-S3 on breadboard or custom PCB
   - Wire 5V buck converter output to DevKitC-1 5V pin
   - Add 100µF capacitor across 5V/GND

2. **UART0 (Grid Meter)**
   - Connect GPIO 43 (TX) → MAX485-A DI
   - Connect GPIO 44 (RX) → MAX485-A RO
   - Connect GPIO 2 (DE/RE) → MAX485-A DE+RE
   - Connect MAX485-A VCC to 5V, GND to GND

3. **UART1 (Inverter)**
   - Connect GPIO 17 (TX) → MAX485-B DI
   - Connect GPIO 18 (RX) → MAX485-B RO
   - Connect GPIO 21 (DE/RE) → MAX485-B DE+RE
   - Connect MAX485-B VCC to 5V, GND to GND

4. **RS485 Cabling**
   - Route shielded pair from MAX485-A A/B to EM500
   - Route shielded pair from MAX485-B A/B to Inverter
   - **DO NOT bridge Bus A and Bus B**
   - Connect 120Ω terminator at **end** of each bus (not in middle)
   - Shield ground at controller only (star point), NOT at devices

5. **Status LED**
   - Optional: GPIO 46 → 220Ω resistor → LED anode
   - LED cathode to GND
   - Firmware pulses on WiFi connection

6. **Enclosure**
   - Mount ESP32-S3 + MAX485 on DIN rail
   - Install cooling: ensure 2cm clearance for airflow
   - Cable glands for RS485 and power entry
   - Leave drain hole at bottom (moisture escape)

---

## 6. Verification Procedures

### Power-On Self-Test & Multi-Device Verification

### 1. Connect USB-C to Dev Machine
   - Check if DevKitC-1 LED (green) is lit → 5V rail OK
   - Monitor serial output: `115200 baud, 8N1`

### 2. Verify Modbus Multi-Device on Single Port

   **Configuration (NVS):**
   ```
   Device 0: slave_id=1 (grid meter EM500)
   Device 1: slave_id=2 (inverter Huawei)
   Poll frequency: 500ms (2 devices = 1 sec per full cycle)
   ```

   **Expected Serial Output:**
   ```
   [modbus] Polling device 0 (ID 1): frequency=50.00 Hz, power=3427W
   [modbus] Polling device 1 (ID 2): ac_power=2850W, dc_voltage=380V
   [telemetry] Snapshot ready @ T=1000ms
   [mqtt] Published snapshot to mini-pv/{device_id}/telemetry/grid
   [mqtt] Published snapshot to mini-pv/{device_id}/telemetry/inverter
   ```

### 3. Test Multi-Device Polling

   ```bash
   # Monitor for polling cycle:
   idf.py monitor -p /dev/ttyACM0
   # Watch for staggered reads:
   # T=0ms:     Poll Slave 1
   # T=100ms:   Poll Slave 2
   # T=200ms:   Snapshot ready → Publish
   # T=1000ms:  Cycle repeats
   ```

### 4. Verify No CRC Errors

   ```bash
   # Count errors over 10 cycles (~10 seconds):
   # Expected: 0 CRC errors
   # Warning: >5% error rate → add shielding/terminator
   ```

### Hardware Validation

```
Continuity Tests:
├─ 5V rail to all VCC pins: OK
├─ GND to all GND pins: OK
├─ ESP32-S3 GPIO 43 ↔ MAX485-A DI: OK
├─ ESP32-S3 GPIO 44 ↔ MAX485-A RO: OK
├─ MAX485-A A pin ↔ EM500 A pin: OK
├─ MAX485-A B pin ↔ EM500 B pin: OK
└─ 120Ω terminator between A-B (end only): OK

Voltage Tests:
├─ 5V rail: 4.8-5.2V (under load)
├─ 3.3V rail: 3.2-3.4V
├─ GPIO idle level: 0V or 3.3V (stable)
├─ RS485 A/B idle: 1.5-2.5V (differential)
└─ No short circuits detected

Modbus Tests:
├─ Send Modbus RTU request to EM500
├─ Oscilloscope: verify RS485 line transitions
├─ Capture: frame timing, baud rate, CRC
└─ Expected: <2ms response time
```

---

## 8. Phase 1 Testing Checklist

### Multi-Device on Single RS485 Port

**Setup:**
- [ ] Grid meter (Rozwell EM500) wired to RS485 A/B (Slave ID 1)
- [ ] Inverter (Huawei) wired to RS485 A/B (Slave ID 2) — **same bus as meter**
- [ ] 120Ω terminator at end of chain (both A and B)
- [ ] Firmware configured: poll both slaves every 500ms

**Verification:**
- [ ] Serial output shows alternating reads: meter → inverter → meter (no collisions)
- [ ] Both devices report online (error_count = 0)
- [ ] Snapshot includes fields from both devices every 1-2 seconds
- [ ] CRC error rate < 0.1% over 100 cycles (~100 seconds)
- [ ] MQTT broker receives telemetry from both devices

**Failure Modes & Remediation:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| Meter reads OK, inverter timeout | Slave ID mismatch | Verify inverter actual ID (try 0x01, 0x02, 0xF7) |
| Both devices timeout after 5 minutes | Heat dissipation | Add cooling fan, check 5V supply stability |
| CRC errors on inverter only | EMI from inverter power lines | Shorten RS485 cable, add ferrite clamp on inverter cable |
| Meter alternately online/offline | Max485 driver power issue | Check 5V rail with multimeter (should be 4.8-5.2V) |
| Polling stalls after 1 hour | Memory leak or task crash | Run `idf.py monitor` continuously, check heap_free |

### Optional: Dual RS485 Isolation Test

**Setup (If Single Port Shows >1% CRC Errors):**
- [ ] Move inverter to RS485 Port B (UART1, GPIO 17/18)
- [ ] Keep meter on Port A (UART0, GPIO 43/44)
- [ ] Each port gets its own MAX485 module + separate terminator
- [ ] Firmware: Create second device entry on port B

**Verification:**
- [ ] Both devices responsive (error_count = 0)
- [ ] CRC error rate drops (compare before/after)
- [ ] Snapshot includes fields from both ports (merged)
- [ ] Modbus bus utilization: ~40% CPU (room for more devices)

---

## 8. Production Recommendations

1. **Custom PCB**
   - Replace breadboard with 2-layer PCB (cost: ~$30 qty 5)
   - Integrate MAX485 + buck converter on board
   - Add ESD protection (TVS diodes on RS485 lines)

2. **Enclosure**
   - IP65 polycarbonate box (wall or DIN-mount)
   - Conformal coating on PCB (moisture resistance)
   - Thermal vias under ESP32-S3 for heat dissipation

3. **Cabling**
   - M12 X-coded connectors (industrial standard for RS485)
   - Pre-assembled shielded cables with ferrite chokes
   - Label cables: "Grid Meter / Channel A" and "Inverter / Channel B"

4. **Testing**
   - EMI/RFI immunity test (IEC 61000-4-6)
   - Temperature range: -10°C to +60°C (typical solar installs)
   - Humidity: 95% RH non-condensing

---

## 9. Quick Reference

### Modbus RTU Defaults
```
Baud Rate: 9600 bps
Data Bits: 8
Stop Bits: 1
Parity: None (8N1)
Timeout: 1000 ms
Retry: 3 attempts
```

### ESP32-S3 Development Commands
```bash
# Build firmware
cd firmware/esp32-s3
idf.py set-target esp32s3
idf.py menuconfig
idf.py build

# Flash to device
idf.py -p /dev/ttyACM0 flash monitor

# Erase all (fresh start)
idf.py -p /dev/ttyACM0 erase-flash

# Monitor serial output
idf.py monitor -p /dev/ttyACM0

# Generate OTA image
idf.py build
esptool.py --chip esp32s3 image_info build/app.bin
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-02  
**Next Review:** After Phase 1 hardware bring-up
