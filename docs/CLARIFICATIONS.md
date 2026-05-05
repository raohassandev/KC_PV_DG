# Mini PV Controller — Architecture Clarifications & Next Steps

**Version:** 1.0  
**Date:** 2026-05-02  
**Status:** Ready for Phase 1 Execution

---

## Executive Summary: Key Clarifications

### 1. Multi-Device Architecture (NOT Separate Channels)

**Old Assumption:** Each device on dedicated RS485 channel (Port A for meters, Port B for inverters)

**Actual Requirement:** Multiple devices on **same RS485 port** using Modbus slave IDs (1-247)

**Impact:**
- ✅ **Simpler wiring** — Only one MAX485 module needed initially
- ✅ **Lower cost** — No extra hardware
- ⚠️ **Potential bottleneck** — All devices share same bus, but acceptable for 2-4 devices per port
- 🔧 **Fallback** — Use dual ports (A/B) if CRC error rate >1% (noise isolation)

**Phase 1 Implementation:**
```
RS485 Port A (UART0):
  ├─ Slave ID 1: Rozwell EM500 (grid meter)
  └─ Slave ID 2: Huawei Sun2000 (inverter)
    Both polled every 500-1000ms, staggered to prevent collisions

RS485 Port B (UART1): Optional
  Available for secondary site or dual-inverter backup
```

**Polling Strategy (Firmware):**
```
T=0ms:    Poll Slave 1 (meter) ──→ ~80ms round-trip
T=100ms:  Poll Slave 2 (inverter) ──→ ~100ms round-trip
T=200ms:  Both responses in ──→ Create snapshot
T=210ms:  Publish to MQTT + WebSocket
T=1000ms: Repeat cycle

Result: 1/sec telemetry per device, 2/sec composite snapshot possible
```

---

### 2. Dynamic Protocol Selection (RTU vs. TCP/IP)

**Per-Device Configuration:**
```typescript
interface ModbusDevice {
  protocol: 'RTU' | 'TCP';
  port: 'A' | 'B' | 'ethernet_gateway';
  slave_id?: number;           // RTU only
  gateway_ip?: string;         // TCP only
}
```

**Phase 1:** RTU only (simpler, lower latency)  
**Phase 2+:** Add TCP/IP fallback for sites without RS485

**Example (Mixed Config):**
```json
{
  "devices": [
    {
      "device_id": "meter_grid",
      "protocol": "RTU",
      "port": "A",
      "slave_id": 1
    },
    {
      "device_id": "inverter_main",
      "protocol": "RTU",
      "port": "A",
      "slave_id": 2
    },
    {
      "device_id": "meter_backup",
      "protocol": "TCP",
      "gateway_ip": "192.168.1.100:502"
    }
  ]
}
```

---

### 3. Device Support (Finalized Brands)

**Phase 1 MVP:**

| Type | Brand | Model | Status | Temp Source |
|------|-------|-------|--------|-------------|
| Meter | Rozwell | EM500 | ✅ Implemented | No temp data |
| Meter | Carlo Gavazzi | WM15 | 🔨 Phase 1 | No temp data |
| Inverter | Huawei | Sun2000 series | 🔨 Phase 1 | Modbus (string temps) |

**Temperature Data: Modbus Only**
- ✅ NO physical temperature sensors (DS18B20, 1-Wire, etc.)
- ✅ Huawei exposes string temps via Modbus registers
- ✅ Each string: voltage, current, temperature
- ✅ Lower hardware cost, simpler maintenance

---

### 4. No Battery Support (Phase 1)

- ❌ Battery systems are **out of scope** for MVP
- ✅ Reserved fields in telemetry schema (for future compatibility)
- ✅ Focus: Single-bus PV + Grid with Dynamic Zero Export only
- 📅 Re-evaluate in Phase 2 if hybrid (PV + Battery) required

---

### 5. Modbus Polling Frequency (Optimized)

**Target: At least 1/second per device, preferably faster**

| Data Type | Frequency | Rationale |
|-----------|-----------|-----------|
| **AC Power (Grid/Inverter)** | 2/sec (500ms) | Fast ramp detection, export control precision |
| **DC Power (PV Strings)** | 2/sec (500ms) | MPPT tracking, string health monitoring |
| **String Temps** | 1/sec (1000ms) | Lower priority, grouped with power reads |
| **Alarms** | 1/sec (1000ms) | Event-driven preferred, but periodic fallback |
| **Energy Totals** | 1/sec (accumulate from power) | Computed from snapshots |

**Adaptive Strategy:**
- Baseline: 500ms cycle (2/sec) for all critical data
- If network latency detected (RTT >300ms): Fall back to 1000ms automatically
- If RTT <100ms: Attempt 200ms (5/sec) on power-only registers

**Modbus Bus Utilization Example (2 devices @ 500ms):**
```
Request: ~100 bytes → TX: 10ms
Response: ~100 bytes → RX: 10ms
Processing: ~20ms
Margin: ~10ms
Total per device: ~50ms
Stagger: 50ms apart
Cycle: 100ms per device per cycle
5 cycles/sec possible on single port

Result: Each device updates 5/sec if sufficient headroom
```

---

### 6. Mobile App: Scalable & Reusable Components

**Architecture (React Native):**

```typescript
// Reusable component: Device telemetry display
<DeviceTelemetry
  device={device}
  fieldMappings={getFieldsForBrand(device.brand_id)}
  readOnly={!hasPermission('EDIT_DEVICE')}
/>

// Reusable: Role-based access
{canViewTelemetry && <TelemetryTab />}
{canConfigureDevices && <ConfigTab />}
{canViewLogs && <DiagnosticsTab />}

// Reusable: Device registry UI
<DeviceList
  devices={devices}
  onDiscovery={handleDiscovery}
  onConfigure={handleConfigure}
/>
```

**Roles (Role-Based Features):**
```
Owner:
  ✅ View all telemetry
  ✅ Configure devices
  ✅ Acknowledge alarms
  ✅ Export data
  ✅ View logs

Installer:
  ✅ View telemetry
  ✅ Configure devices
  ✅ Acknowledge alarms
  ✅ Export data
  ❌ View logs

Support:
  ✅ View telemetry
  ❌ Configure
  ❌ Acknowledge alarms
  ✅ Export data
  ✅ View logs
```

---

## Implementation Priorities

### Phase 1 (Weeks 1-8): Core Multi-Device

**Week 1-2: Hardware Bring-Up**
- [ ] Assemble ESP32-S3 + MAX485 (single port, multi-slave)
- [ ] Test Modbus polling: Slave ID 1 (meter) → Slave ID 2 (inverter)
- [ ] Verify 500ms cycle, <0.1% CRC errors

**Week 3-4: Multi-Device Firmware**
- [ ] Modbus device registry (NVS storage)
- [ ] Device discovery (scan slave IDs 1-247)
- [ ] Adapter profiles: Rozwell EM500 + Huawei Sun2000
- [ ] Staggered polling orchestration

**Week 5-6: Data Handling & Protocol**
- [ ] Energy storage (ring buffer, 10+ days)
- [ ] Telemetry snapshot builder
- [ ] MQTT client (publish snapshots)
- [ ] WebSocket server (real-time push)

**Week 7-8: Mobile + Testing**
- [ ] Mobile app: Device discovery screen
- [ ] Multi-device telemetry display (reusable component)
- [ ] Live dashboard (grid + inverter + alarms)
- [ ] End-to-end integration testing

---

### Phase 2 (Weeks 9-16): Advanced Telemetry & Web

**Additions:**
- [ ] Dual RS485 port support (if noise isolated)
- [ ] Second inverter + string data aggregation
- [ ] Carlo Gavazzi WM15 meter adapter
- [ ] Web dashboard (React/Next.js)
- [ ] Advanced energy analytics

---

### Phase 3+ (Weeks 17+): Production Hardening

**Additions:**
- [ ] OTA firmware updates
- [ ] Error recovery + watchdog
- [ ] Cloud bridge (optional)
- [ ] Multi-brand support (SMA, Growatt, Solax)
- [ ] Home Assistant integration (MQTT autodiscovery)

---

## Critical Implementation Tasks

### Firmware (`firmware/esp32-s3/main/`)

**Files to Create/Modify:**
1. `modbus_device_registry.c/h`
   - Store/load device config from NVS
   - Track online/offline status per device
   - Error counting + recovery logic

2. `modbus_polling_orchestrator.c/h`
   - Cycle through all enabled devices
   - Stagger requests (prevent collisions)
   - Adaptive frequency based on RTT

3. `adapters/rozwell_em500.c` (update existing)
   - Multi-register parsing (already done)
   - Ensure per-device slave ID support

4. `adapters/huawei_sun2000.c` (new)
   - AC/DC/string data registers
   - Per-string temperature parsing
   - Alarm code translation

5. `adapters/gavazzi_wm15.c` (new, Phase 1 Week 2+)
   - Voltage, current, power per phase
   - Power factor + harmonics (THD)
   - Optional: energy metering

6. `telemetry_collector.c` (update)
   - Merge data from multiple devices
   - Timestamp each field (last-update)
   - Compute energy totals

### Mobile (`mobile/src/`)

**Reusable Components:**
1. `components/DeviceDiscovery.tsx`
   - Scan RS485 ports (firmware API)
   - Select devices to enable
   - Assign human-readable names

2. `components/DeviceTelemetry.tsx` (Generic)
   - Accept field mappings (brand-specific)
   - Render grid of metrics (scalable layout)
   - Show online/offline status

3. `components/RoleBasedView.tsx` (Wrapper)
   - Conditionally render tabs/buttons per role
   - Feature flags: view/edit/export permissions

4. `store/deviceStore.ts`
   - Redux store for device registry
   - Cache remote device list
   - Subscribe to real-time updates

---

## Success Criteria (End of Phase 1)

✅ **Hardware:**
- Multi-device (meter + inverter) on single RS485 bus works without collisions
- CRC error rate <0.1% over 1-hour soak test
- Dual RS485 ports operational (if noise observed)

✅ **Firmware:**
- Device registry loaded from NVS, survives reboot
- Polling frequency ≥2/sec per device (500ms cycle)
- Snapshot includes fields from all enabled devices
- MQTT/WebSocket publish every 1-2 seconds without drops

✅ **Mobile App:**
- Device discovery + configuration end-to-end
- Live dashboard shows meter + inverter telemetry (reusable component)
- Role-based access enforced (owner/installer/support)
- Energy history accessible (basic view: 24h, 7d, 30d)

✅ **Documentation:**
- Device adapter registry finalized (Rozwell, Huawei, WM15)
- API spec published (device config endpoints)
- Modbus register maps documented for each brand

---

## Known Constraints & Trade-offs

### Single RS485 Bus (Multi-Device)
- ✅ Simpler Phase 1 implementation
- ⚠️ Max throughput ~5 devices at 2/sec each (before blocking other operations)
- 🔧 If >1% CRC errors observed: Use dual ports (Port A/B) for isolation

### No Temperature Sensors
- ✅ Lower cost, simpler deployment
- ⚠️ Depends on inverter Modbus support (Huawei ✅, others TBD)
- 🔧 Fallback: Skip temp data if not available (graceful degradation)

### Dynamic Protocol Selection (RTU vs. TCP)
- ✅ Future-proof architecture
- ⚠️ TCP adds ~50-100ms latency (acceptable for non-critical meters)
- 🔧 Phase 1: RTU only (fewer moving parts)

### Energy Storage (4MB for 10+ days)
- ✅ Fits on ESP32-S3 flash
- ⚠️ ~1 sample/min granularity (per-second logging impossible)
- 🔧 Solution: Ring buffer + hourly/daily aggregation

---

## Next Immediate Actions (Week 1)

1. **Order Hardware** (expedited shipping)
   - 3× ESP32-S3 DevKitC-1 ($18 each)
   - 6× MAX485 modules ($4 each) — extra for dual-port testing
   - Shielded twisted pair, terminators, cables (~$30)
   - Total: ~$100-150

2. **Set Up Development Environment**
   - Install ESP-IDF v5.2 (all dev machines)
   - Clone KC_PV_DG repo, create `esp32-s3-migration` branch
   - Verify build: `idf.py set-target esp32s3 && idf.py build`

3. **Create Device Registry Infrastructure**
   - Sketch `modbus_device_registry.c` structure
   - Define NVS storage layout for device config
   - Create TypeScript interfaces in `dynamic_zero_export/adapters/`

4. **Spike: Multi-Slave Polling on Single UART**
   - Test Slave ID 1 + Slave ID 2 on UART0 (week 1 Friday)
   - Verify staggered polling, <0.1% CRC errors
   - Document results for team

5. **Mobile Reusability Refactoring**
   - Extract telemetry display into reusable component
   - Add role-based feature flags
   - Start device discovery UI skeleton

---

## Document Cross-References

**Main Planning:**
- [MINI_PV_CONTROLLER_PLAN.md](MINI_PV_CONTROLLER_PLAN.md) — Full 15-section architecture
- [DEVICE_REGISTRY.md](DEVICE_REGISTRY.md) — Device adapters, Modbus registers, multi-device polling
- [HARDWARE_SETUP.md](HARDWARE_SETUP.md) — GPIO, wiring, multi-device on single bus, testing

**To Be Created:**
- API_SPECIFICATION.v1.md (device config endpoints + Modbus discovery)
- MODBUS_REGISTER_MAPS.md (detailed register addresses per brand)
- MOBILE_COMPONENT_GUIDE.md (reusable component patterns)

---

**Document Version:** 1.0  
**Created:** 2026-05-02  
**Next Sync:** 2026-05-09 (Week 1 completion review)
