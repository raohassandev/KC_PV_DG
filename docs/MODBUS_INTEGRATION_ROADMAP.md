# Modbus Device Integration Roadmap

**Version:** 1.0  
**Date:** 2026-05-02  
**Scope:** Complete Modbus support for inverters, meters, and energy analyzers  
**Status:** Planning Phase

---

## Executive Summary

This roadmap defines the complete device integration strategy for the Mini PV Controller using Modbus RTU/TCP protocols. The system will:

1. **Communicate with multiple inverter brands** (Huawei, Goodwe, Growatt, Solis, Inverex, Chint, Knox, Fox)
2. **Monitor grid, generators, and solar systems** (via energy meters/analyzers)
3. **Control PV output based on 4 scenarios:**
   - **Zero Export**: No power to grid (excess → load or waste)
   - **Limited Export**: Export ≤ threshold (e.g., 5 kW)
   - **Maximum Export**: Max allowed by grid connection
   - **Generator Load Control**: 30-50% load targeting + extra from solar
4. **Provide real-time & historical monitoring** via REST API + MQTT/WebSocket for Expo app

---

## 1. Device Ecosystem

### 1.1 Inverter Brands (PV Control)

| Brand | Models | Protocol | Register Map | Status | Notes |
|-------|--------|----------|--------------|--------|-------|
| **Huawei** | SUN2000-3KTL to 215KTL | Modbus RTU/TCP | V3.0 | Planning | Via SmartLogger or direct |
| **Goodwe** | ES, ET, EH series | Modbus RTU | Register map documented | Planning | Multi-phase support |
| **Growatt** | MIN, SPF, TL series | Modbus RTU | 66-page manual | Planning | Energy storage capable |
| **Solis** | RHI, RHM series | Modbus RTU | 47-page manual | Planning | Grid support featured |
| **Inverex** | Evo, Axiom series | Modbus RTU | TBD (manual needed) | Planning | Pakistan-focused |
| **Chint** | CPS 100-125kW | Modbus RTU | UL-certified | Planning | Large commercial units |
| **Knox** | ASW 30-50K (G2) | Modbus RTU | V2.1.5 (44-page) | Planning | Generator-aware (backup) |
| **Fox** | H1 series | Modbus RTU | TBD (manual needed) | Planning | Hybrid inverters |
| **SMA** | SB/ST series | Modbus/SunSpec | TI manual available | Future | SunSpec implementation |
| **Solar Edge** | Terramax | Modbus/SunSpec | Technical note available | Future | Optimizer integration |

### 1.2 Energy Meters & Analyzers (Monitoring)

| Device | Type | Protocol | Registers | Status | Notes |
|--------|------|----------|-----------|--------|-------|
| **Rozwell EM500** | 3-phase grid meter | Modbus RTU | 60+ registers | ✅ Implemented | Frequency, voltage, current, power, energy |
| **Carlo Gavazzi WM15** | Universal meter | Modbus RTU | 40+ registers | Planning | Voltage, current, power factor, harmonics |
| **Iskra MC3x0x** | 3-phase meter | Modbus RTU | Documented | Planning | Per-phase & total energy |
| **KPM37** | Smart power meter | Modbus RTU | 50+ registers | Planning | Demand, reactive power |
| **Circutor** | D-Series meters | Modbus RTU | Device-specific | Planning | Load profile analysis |
| **Janitza** | UMG801 | Modbus RTU | 90+ registers | Future | Power quality analysis |

### 1.3 Supporting Devices

| Device | Type | Protocol | Purpose |
|--------|------|----------|---------|
| **Generator Monitor** | Status signal | Digital I/O (TBD) | Load % detection, running status |
| **Battery System** | Energy storage | Modbus RTU (if present) | Future (not Phase 1) |
| **EV Charger** | Load | Modbus RTU (if present) | Future demand response |

---

## 2. Core Control Logic

### 2.1 Zero Export Strategy (Primary)

**Objective:** Prevent excess solar energy from flowing to grid

**Algorithm:**
```
ZERO_EXPORT_LOGIC:
  1. Read grid meter (EM500) → grid_power (+ import, - export)
  2. If grid_power < 0 (exporting):
     a. Calculate excess = abs(grid_power) + deadband (100W)
     b. Send LIMIT_ACTIVE_POWER cmd to inverter(s)
     c. Set active_power_limit = (solar_now - excess)
  3. If grid_power > 0 (importing):
     a. Gradually increase inverter power limit toward max
     b. Use ramp rate (1% per 10 sec) to avoid oscillation
  4. Deadband: ±100W to prevent hunting
  5. Poll frequency: 2-5 Hz (200-500 ms)
```

**Modbus Command:**
- Inverter register: `ACTIVE_POWER_LIMIT_SETPOINT` (brand-specific)
- Value: 0-100% or 0-max_watts (check datasheet)
- Write: FC 0x06 (single register) or FC 0x10 (multiple registers)

**Supported Inverter Commands:**
| Brand | Limit Register | FC | Value Range | Unit |
|-------|----------------|-----|-------------|------|
| Huawei | 0x4640 | 0x06 | 0-100 | % |
| Goodwe | 0x1000 | 0x06 | 0-100 | % |
| Growatt | 0x00F5 | 0x06 | 0-100 | % |
| Solis | 0x0200 | 0x06 | 0-100 | % |
| Chint CPS | 0x0670 | 0x06 | 0-max | W |
| Knox ASW | 0x0E10 | 0x06 | 0-100 | % |

---

### 2.2 Generator Load Management

**Objective:** Prevent solar from overstressing generator (min load protection)

**Algorithm:**
```
GENERATOR_CONTROL_LOGIC:
  1. Read generator status:
     a. Check digital input for "gen_running" signal
     b. Read generator load % (if available via meter on gen circuit)
     c. Detect source: (gen_power > threshold AND gen_running == 1)
  2. If generator is running:
     a. Min load thresholds:
        - Diesel: 30% of rating
        - Gas/LPG: 50% of rating
     b. Monitor gen_power from dedicated meter
     c. If gen_load < min_threshold:
        - REDUCE solar output fast (ramp: 5% per sec)
        - Log warning
     d. If gen_load > 70% AND solar available:
        - INCREASE solar output (ramp: 1% per 10 sec)
        - Supply extra to reduce grid draw
  3. If generator stops:
     - Resume ZERO_EXPORT or LIMITED_EXPORT logic
```

**Supported Generator Load Scenarios:**
- **Scenario A:** Generator + Solar + Grid
  - Strategy: Solar → Load, Gen @ 30-50%, Grid for balance
- **Scenario B:** Solar + Grid (no gen)
  - Strategy: Apply ZERO_EXPORT policy
- **Scenario C:** Generator + Grid (no solar)
  - Strategy: Monitor only, no PV control

**Generator Detection:**
- Digital input: GPIO pin monitoring gen_running signal
- Meter-based: Secondary meter on gen feeder reading current/power
- Hybrid: Combine both for reliability

---

### 2.3 Export Control Modes

| Mode | Use Case | Logic | Limit Setting |
|------|----------|-------|----------------|
| **Zero Export** | Net metering prohibited | Export ≤ 0W | Dynamic (grid-aware) |
| **Limited Export** | Grid contract limit | Export ≤ threshold | Fixed (e.g., 5 kW) |
| **Maximum Export** | No restrictions | Export ≤ system max | 100% of solar capacity |
| **Generator Priority** | Backup scenario | Gen load > 30/50%, solar 2ndary | Adaptive |

---

## 3. Modbus Device Profiles

### 3.1 Inverter Profile Structure

Each inverter adapter must implement:

```typescript
interface InverterProfile {
  // Identity
  id: string;                  // 'huawei', 'growatt', etc.
  manufacturer: string;
  model_pattern: string;       // e.g., "SUN2000-.*"
  modbus_type: 'RTU' | 'TCP';
  default_slave_id: number;
  
  // Read registers (monitoring)
  read_registers: {
    status_addr: number;                    // Device status
    pv_power_addr: number;                  // Current PV output (W)
    grid_power_addr: number;                // Grid connection power
    efficiency_addr?: number;               // Inverter efficiency %
    temperature_addr?: number;              // Internal temp
    dc_voltage_addr?: number;               // DC side voltage
    fault_code_addr?: number;               // Fault/warning codes
  };
  
  // Write registers (control)
  write_registers: {
    active_power_limit_addr: number;        // Main control point
    active_power_limit_unit: '%' | 'W';     // Value interpretation
    active_power_limit_max: number;         // Max value (100 or watts)
    enable_addr?: number;                   // On/off switch
  };
  
  // Conversions
  conversions: {
    pv_power_scale: number;                 // e.g., 10 W/reg
    grid_power_scale: number;
    frequency_scale?: number;
    temperature_scale?: number;
  };
}
```

### 3.2 Energy Meter Profile Structure

```typescript
interface MeterProfile {
  id: string;                  // 'em500', 'wm15', etc.
  type: 'grid_meter' | 'sub_meter' | 'analyzer';
  modbus_type: 'RTU' | 'TCP';
  default_slave_id: number;
  
  // Read registers
  read_registers: {
    frequency_addr: number;                 // Hz
    voltage_l1_addr: number;                // Phase voltages
    voltage_l2_addr: number;
    voltage_l3_addr: number;
    current_l1_addr: number;                // Phase currents
    current_l2_addr: number;
    current_l3_addr: number;
    active_power_total_addr: number;        // Total power (signed)
    reactive_power_addr?: number;
    power_factor_addr?: number;
    import_energy_addr?: number;            // Energy counters
    export_energy_addr?: number;
  };
  
  // Conversions
  conversions: {
    voltage_scale: number;                  // V/reg
    current_scale: number;                  // A/reg
    power_scale: number;                    // W/reg
    energy_scale?: number;                  // kWh/reg
    frequency_scale?: number;
  };
}
```

---

## 4. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
**Goal:** Working zero export with Huawei & EM500

**Tasks:**
1. **Modbus RTU enhancement** (Firmware)
   - Extend `modbus_rtu.c` to support FC 0x06 & 0x10 (write operations)
   - Add timeout + retry logic for robustness
   - Test with 2-3 devices on same RS485 bus
   
2. **Huawei Inverter Adapter** (Firmware)
   - Parse SUN2000 Modbus registers
   - Implement read: `0x0206` (status), `0x0207` (PV power), `0x0209` (limit%)
   - Implement write: `0x4640` (ACTIVE_POWER_LIMIT)
   - Test with actual hardware or simulator
   
3. **Zero Export Policy Engine** (Firmware)
   - Implement core loop: read EM500 → decide limit → write to inverter
   - Add deadband logic (±100W)
   - Add ramp limiting (prevent rapid oscillation)
   - Log decisions for debugging
   
4. **REST API** (Firmware)
   - `GET /inverters` → list connected inverters with status
   - `GET /meters` → list connected meters with readings
   - `PUT /inverters/{id}/limit` → set power limit manually
   - `GET /policies` → current control policy status

5. **Mobile Integration** (Expo App)
   - Display real-time power flow (PV, grid, load)
   - Show current export limit status
   - Manual override capability

**Deliverables:**
- Working zero export on Huawei + EM500
- Modbus communication proven with 2+ devices on bus
- REST API for mobile app polling

**Success Criteria:**
- System prevents grid export (export ≤ 0W, ±100W deadband)
- Ramp-down time when grid starts exporting: < 10 sec
- Ramp-up time when solar available: < 60 sec
- No crashes, graceful error handling

---

### Phase 2: Multi-Brand Inverter Support (Weeks 5-8)
**Goal:** Support 6 inverter brands (Huawei, Goodwe, Growatt, Solis, Chint, Knox)

**Tasks per Brand:**
1. Validate Modbus register map from datasheet
2. Implement brand adapter profile (follow structure in 3.2)
3. Test: read status, read power, write limit
4. Integrate into device registry
5. Document register offsets & scaling factors

**Testing:**
- Hardware testing if available
- Simulator/emulator if not
- Cross-validate with field data from existing sites

**Deliverables:**
- 6 working inverter adapters
- Device registry populated with brand profiles
- Documentation of each brand's quirks

---

### Phase 3: Energy Analyzer Support (Weeks 9-11)
**Goal:** Support 4+ meter/analyzer types for comprehensive monitoring

**Devices:**
1. **Carlo Gavazzi WM15** (Carlo Gavazzi WM15 Rs-485 Registers.pdf)
   - 40+ registers for voltage, current, power, power factor, harmonics
   
2. **Iskra MC3x0x** (MC3x0x_GB_22444000_Usersmanual manual)
   - 3-phase meter with energy counters
   
3. **KPM37 Smart Meter**
   - Demand, reactive power, load profile
   
4. **Circutor D-Series**
   - Device-specific registers (needs datasheet review)

**Tasks:**
1. Extract register maps from PDFs
2. Build meter adapters (read-only, no control)
3. Integrate into monitoring pipeline
4. Add sub-meter concept (gen feeder, load feeder, etc.)

**Deliverables:**
- 4+ meter adapters working
- Multi-meter support in firmware polling loop
- Expo app showing grid, sub-meters, generator load

---

### Phase 4: Generator Load Management (Weeks 12-14)
**Goal:** Safe PV control in generator scenarios

**Tasks:**
1. **Hardware Interface**
   - GPIO pin for `gen_running` signal
   - Optionally: secondary RS485 meter on gen circuit
   
2. **Control Logic**
   - Implement generator detection state machine
   - Min load protection: 30% (diesel) / 50% (gas)
   - Fast ramp-down when gen load drops
   - Graceful shutdown if gen fails
   
3. **Testing**
   - Simulate gen start/stop events
   - Verify solar is cut off when gen load risks drop below min
   - Verify solar re-enables when gen is removed
   
4. **Modes**
   - Gen-only scenario (solar blocked)
   - Gen + Solar (balanced load sharing)
   - Solar-only (zero export)

**Deliverables:**
- Working gen/solar load sharing
- Logic prevents gen starvation
- Mobile app shows current scenario

---

### Phase 5: Polish & Hardening (Weeks 15-16)
**Goal:** Production-ready system

**Tasks:**
1. **Reliability**
   - Retry logic for failed Modbus reads
   - Watchdog timers for stale data
   - Fail-safe fallback when devices offline
   
2. **Performance**
   - Optimize Modbus polling schedule
   - Reduce latency in control loop
   - Memory profiling on ESP32-S3
   
3. **Documentation**
   - Field commissioning guide
   - Troubleshooting common Modbus issues
   - Register map reference for each brand
   
4. **Mobile App Enhancements**
   - History graphing (10+ days)
   - Alerts (export detected, gen load low, etc.)
   - Role-based access (owner vs installer vs support)

**Deliverables:**
- Production firmware release
- Comprehensive documentation
- Support playbook

---

## 5. Device Communication Matrix

### Multi-Device Bus Example: Single RS485 + Multiple Slave IDs

```
ESP32-S3 → RS485 (single UART)
          ├─ Slave ID 1: Rozwell EM500 (grid meter)
          ├─ Slave ID 2: Huawei SUN2000 (inverter)
          ├─ Slave ID 3: Gavazzi WM15 (sub-meter on gen)
          └─ Slave ID 4: Iskra MC3xx (load meter)

Polling Schedule (500 ms cycle):
  T+0 ms:   Read EM500 (grid power, freq, voltage)
  T+100 ms: Read Huawei (PV power, status)
  T+200 ms: Read WM15 (gen load %)
  T+300 ms: Read Iskra (building load)
  T+400 ms: Decide control (zero export, gen load mgmt)
  T+450 ms: Write Huawei limit register
  → Repeat
```

### TCP/IP Gateway Option (Future)

For large sites or remote monitoring:
```
ESP32-S3 → Ethernet (via W5500)
         → TCP Port 502
         ├─ Modbus TCP to multiple remote inverters/meters
         └─ Cloud API (MQTT/WebSocket) for Expo app
```

---

## 6. Failure Modes & Resilience

| Failure | Detection | Action |
|---------|-----------|--------|
| Grid meter offline | Timeout on EM500 read | Disable zero export, allow export (fail-safe) |
| Inverter offline | Timeout on Huawei read | Stop sending limit commands, log error |
| Modbus CRC error | CRC mismatch | Retry (1x), then skip this cycle |
| RS485 bus collision | Unexpected slave ID in response | Log collision, continue |
| Generator stuck on | Gen signal stays high > 30 min | Alert user, maintain solar block |
| Solar inverter error | Error code in status register | Gracefully degrade, monitor only |

---

## 7. Register Map Reference (Quick Lookup)

### Rozwell EM500
- Grid power (W): `0x003A` (input register, 1 W/unit)
- Frequency (Hz): `0x0032` (0.01 Hz/unit)
- Voltage L1-N (V): `0x003C` (0.1 V/unit)
- Current L1 (A): `0x0048` (0.01 A/unit)
- Import energy (kWh): `0x1B21` (4 registers, ÷ 4294967296 × 0.01)

### Huawei SUN2000
- PV Power (W): `0x0207` (10 W/unit)
- Status: `0x0206` (0=offline, 1=grid-connected, etc.)
- Active Power Limit (%): `0x4640` (0-100%)
- Grid Power (W): `0x0209` (signed, 1 W/unit)

### Goodwe
- Active Power Limit (%): `0x1000` (0-100%)
- PV Power (W): `0x0500` (1 W/unit)

### Growatt
- Active Power Limit (%): `0x00F5` (0-100%)

### Solis
- Active Power Limit (%): `0x0200` (0-100%)

*(Full register maps for all brands in dedicated adapter documentation)*

---

## 8. Testing & Validation Plan

### Unit Tests (Firmware)
- Modbus CRC calculation
- Register read/write parsing
- Zero export deadband logic
- Generator load state machine

### Integration Tests (Hardware)
- 2+ devices on single RS485 bus
- Modbus collision handling
- Ramp limiting behavior
- Export prevention accuracy (±100W)

### Field Tests (Real Site)
- 8+ hour monitoring cycle
- Grid export trending (target: ≤ 0W avg)
- Generator load protection verification
- Mobile app real-time sync

### Load Tests
- Max poll frequency (500 ms cycle)
- Memory usage (PSRAM allocation)
- Crash recovery (watchdog resets)

---

## 9. Success Metrics

| Metric | Target | Verification |
|--------|--------|---------------|
| Export prevention accuracy | ±100W deadband | Grid meter reading vs setpoint |
| Control latency | < 500 ms decision-to-action | Timestamp logs |
| Zero export uptime | > 99.5% (excluding planned downtime) | Firmware monitoring |
| Modbus reliability | > 99.9% read success rate | Error logs |
| Gen load protection | 0 over-speed events | Generator telemetry |
| Mobile app sync | < 2 sec delay | WebSocket latency logs |

---

## 10. Next Actions

### Immediate (This Week)
1. ✅ Review all device datasheets (Huawei, Knox, Growatt, Solis, etc.)
2. ✅ Extract Modbus register maps
3. ☐ Prototype Huawei write operations (FC 0x06)
4. ☐ Test multi-device collision handling

### Short-term (Next 2 Weeks)
1. ☐ Implement zero export loop with real EM500 + inverter
2. ☐ Add rate limiting to prevent hunting
3. ☐ Create Goodwe + Growatt adapters
4. ☐ Test on single RS485 bus with 3 devices

### Medium-term (Weeks 3-4)
1. ☐ Add generator load detection (GPIO + optional meter)
2. ☐ Implement min load protection logic
3. ☐ Support multi-meter (grid + sub-meters)
4. ☐ Complete all 6 inverter brands

---

## Appendix A: Device Datasheets & Manuals

All PDFs located in `docs/`:
- `Inverter/Huawei/Huawei Inverter Modbus Interface Definitions (V3.0).pdf` ✅
- `Inverter/Goodwe/` (if available)
- `Inverter/GROWATT.pdf` ✅
- `Inverter/Solis.pdf` ✅
- `Inverter/Chint/CPS_100_125kW-UL-Modbus-Map-Spec-FW-V120.pdf` ✅
- `Inverter/Knox/MB001_ASW GEN-Modbus-en_V2.1.5(2).pdf` ✅
- `Energy Analyzer/Carlo Gavazzi WM15 Rs-485 Registers.pdf` ✅
- `Energy Analyzer/Iskra. K_MC3x0x_GB_22444000_Usersmanual_Ver_8.00.pdf` ✅
- `Energy Analyzer/KPM37-Three-Phase-Rail-Smart-Power-Meter-instruction-Manual-V4.4-2025.3.pdf` ✅

*(Inverex, Fox, Circutor, Janitza manuals to be sourced)*

---

## Appendix B: Modbus FC Commands Used

- **FC 0x03**: Read Holding Registers (inverter settings, some meter values)
- **FC 0x04**: Read Input Registers (sensor readings, meter data)
- **FC 0x06**: Write Single Register (power limit, on/off switches)
- **FC 0x10**: Write Multiple Registers (complex commands, firmware updates)

---

*Document maintained by: KC PV-DG Team*  
*Last updated: 2026-05-02*  
*Next review: After Phase 1 completion*
