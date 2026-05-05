# Mini PV Controller — Complete Plan Summary

**Project Status:** ✅ Phase 1 Planning Complete  
**Last Updated:** 2026-05-02  
**Ready for:** Execution (Hardware Procurement → Week 1)

---

## What's Been Documented

### 1. **MINI_PV_CONTROLLER_PLAN.md** (Main Architecture)
   - ✅ Hardware comparison (ESP32-S3 vs. KC868-A6)
   - ✅ Multi-device RS485 via slave IDs (not separate channels)
   - ✅ Modbus RTU + TCP/IP dynamic protocol selection
   - ✅ Temperature data from Modbus only (no sensors)
   - ✅ Supported devices: Rozwell EM500, Huawei Sun2000, WM15 Gavazzi
   - ✅ Telemetry schema (all fields, no battery)
   - ✅ Energy storage calculations (4MB for 10+ days)
   - ✅ MQTT, WebSocket, REST API design
   - ✅ 4-phase roadmap (3-4 months MVP)
   - ✅ Risk mitigation + success criteria
   - ✅ Modbus frequency: 2/sec target (500ms), adaptive up to 5/sec

### 2. **DEVICE_REGISTRY.md** (Adapter Pattern & Multi-Device)
   - ✅ Multi-device configuration structure (NVS storage)
   - ✅ Rozwell EM500: Register map, implementation status
   - ✅ Carlo Gavazzi WM15: Register map, Phase 1 task
   - ✅ Huawei Sun2000: AC/DC/string data, temp parsing, Phase 1 task
   - ✅ Device discovery procedure (firmware + mobile app)
   - ✅ Dynamic protocol selection (per-device RTU vs. TCP)
   - ✅ Modbus polling orchestration (staggered, adaptive)
   - ✅ Mobile reusable components (DeviceTelemetry, RoleBasedView)
   - ✅ Role-based access patterns (owner, installer, support)

### 3. **HARDWARE_SETUP.md** (Physical Wiring & Testing)
   - ✅ Multi-device on single RS485 bus (Slave ID 1 + 2)
   - ✅ Optional dual RS485 (Port A/B for isolation if noise >1%)
   - ✅ GPIO allocation clarified (no separate channels)
   - ✅ MAX485 wiring (single module for Phase 1)
   - ✅ Power supply calculations (300-350mA full load)
   - ✅ BOM list (~$71 per board)
   - ✅ Multi-device verification procedures
   - ✅ Troubleshooting multi-device specific issues

### 4. **IMPLEMENTATION_ROADMAP.md** (Week-by-Week Plan)
   - ✅ 2-week immediate actions (procurement → setup)
   - ✅ Phase 1 detailed subtasks (firmware, mobile, testing)
   - ✅ Success criteria per phase
   - ✅ Critical decisions required
   - ✅ Risk mitigations + communication plan

### 5. **CLARIFICATIONS.md** (Key Changes from Your Requirements)
   - ✅ Multi-device on same RS485 (not separate channels) 
   - ✅ Dynamic protocol selection (RTU + TCP/IP option)
   - ✅ Temperature from Modbus only (no sensors)
   - ✅ No battery support (Phase 1)
   - ✅ Modbus frequency ≥1/sec, preferably 2-5/sec
   - ✅ Mobile scalability (reusable components + role-based access)
   - ✅ Supported devices: Huawei, Rozwell, WM15 Gavazzi only

---

## Key Architecture Decisions (Finalized)

### Hardware
```
ESP32-S3 DevKitC-1 (16MB Flash, 8MB PSRAM)
├─ UART0 → MAX485-A → RS485 Port A
│  ├─ Slave ID 1: Rozwell EM500 (grid meter)
│  └─ Slave ID 2: Huawei Sun2000 (inverter)
│
├─ UART1 → MAX485-B → RS485 Port B (Optional, Phase 1+)
│  └─ Backup devices or dual-inverter setup
│
└─ WiFi, NVS, MQTT, WebSocket, REST API
```

### Polling Strategy
```
T=0ms:    Poll Slave 1 (meter) — 80ms RTT
T=100ms:  Poll Slave 2 (inverter) — 100ms RTT
T=200ms:  Composite snapshot ready
T=210ms:  Publish to MQTT + WebSocket
T=1000ms: Repeat (1/sec per device, 2/sec possible)
```

### Device Support (MVP)
| Device | Brand | Status | Temp |
|--------|-------|--------|------|
| Grid Meter | Rozwell EM500 | ✅ Done | N/A |
| Power Quality Meter | Carlo Gavazzi WM15 | 🔨 Phase 1 | N/A |
| Inverter | Huawei Sun2000 | 🔨 Phase 1 | Modbus |

### No Battery Support
- Out of scope for MVP
- Single-bus: PV + Grid only
- Reserved fields for future compatibility

### Mobile: Reusable & Scalable
- Generic `DeviceTelemetry` component (any brand)
- Brand adapter registry (field mappings)
- Role-based access enforcement
- Device discovery + multi-device UI

---

## Immediate Next Steps (Week 1)

### Day 1-2: Procurement & Setup
```bash
# Hardware order (expedited 3-5 day delivery)
- 3× ESP32-S3 DevKitC-1
- 6× MAX485 modules
- RS485 cables + terminators
- 5V power supplies

# Development environment
git clone esp-idf v5.2
pip install esptool
git checkout esp32-s3-migration branch
```

### Day 3-5: Hardware Bring-Up
```bash
# Assemble: ESP32-S3 + MAX485 (single port, multi-slave)
# Test UART0 + GPIO 43/44 (UART0)
# Verify 5V supply + USB-Serial

# Firmware spike: Multi-device polling
idf.py set-target esp32s3
idf.py build
idf.py flash monitor
# Expected: Meter reads + Inverter reads, staggered, no collisions
```

### Day 5 Verification
```
✅ Grid meter (Slave ID 1) responds every 500ms
✅ Inverter (Slave ID 2) responds every 500ms (staggered)
✅ CRC error rate < 0.1%
✅ Telemetry snapshot every 1-2 seconds
✅ MQTT publishes both devices (separate topics)
```

---

## Phase 1 Timeline (8 Weeks)

| Week | Firmware | Mobile | Deliverable |
|------|----------|--------|-------------|
| 1-2 | Multi-device registry, discovery | Reusable components | Hardware working |
| 3 | Device adapters (Huawei, EM500) | Device list UI | Live meter + inverter |
| 4 | Energy storage, aggregation | Energy history view | History persists |
| 5 | MQTT client, WebSocket server | Live dashboard | Real-time telemetry |
| 6 | REST API, performance tuning | Role-based access | Professional UX |
| 7-8 | Testing, integration, OTA prep | QA + Polish | Phase 1 complete |

---

## Files Created/Updated

✅ **New Documents:**
- `docs/MINI_PV_CONTROLLER_PLAN.md` (15 sections, 1000+ lines)
- `docs/DEVICE_REGISTRY.md` (8 sections, 600+ lines) 
- `docs/HARDWARE_SETUP.md` (updated with multi-device)
- `docs/IMPLEMENTATION_ROADMAP.md` (15 sections, 400+ lines)
- `docs/CLARIFICATIONS.md` (summary + decisions)

✅ **Ready for Development:**
- Firmware structure planned (modbus_device_registry.c, adapters/)
- Mobile architecture designed (reusable components)
- API contracts defined
- Device register maps documented

---

## Key Success Factors

1. **Multi-Device on Single RS485** ← Must get staggered polling right (Week 1 spike)
2. **Reusable Mobile Components** ← Generic field mapping for any brand
3. **Device Registry** ← NVS persistence + hot-reload for zero downtime
4. **Modbus Frequency** ← Target 2/sec minimum, adaptive scaling
5. **Temperature from Modbus** ← No extra hardware, simpler logistics
6. **No Battery** ← Scope reduction = faster Phase 1 delivery

---

## Questions for Team

**For Firmware:**
- Huawei string temp register: 1 register per string, or packed?
- WM15: Already have protocol doc? Need Modbus register addresses?
- Preferred: single unified snapshot or separate device snapshots?

**For Mobile:**
- Use Expo or native React Native?
- State management: Redux or Context API?
- Design system: Material UI or custom?

**For Hardware:**
- Do you have physical EM500 + Huawei Sun2000 for testing?
- Target deployment: residential, commercial, utility?
- Outdoor enclosure needed (IP65)?

---

## Risk Mitigation Summary

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Modbus collisions | Data loss every 5 min | Stagger polls (Week 1 validation) |
| CRC errors >1% | Unreliable data | Dual RS485 (Port isolation) |
| Huawei temp register mismatch | Wrong string temps | Contact Huawei, test early |
| Memory leak over 72h | Crash loops | Profile heap, use static alloc |
| WiFi dropout during snapshot | Inconsistent telemetry | Implement offline queue + retry |
| Mobile UI not professional | Stakeholder rejection | Hire designer or use templates |

---

## Go/No-Go Checklist (Before Week 1 Spike)

- [ ] All team members reviewed DEVICE_REGISTRY.md
- [ ] Hardware BOM approved + order placed
- [ ] Firmware team confirmed modbus_polling_orchestrator.c approach
- [ ] Mobile team agreed on reusable component structure
- [ ] Huawei + WM15 register maps obtained
- [ ] Test environment ready (serial monitor, MQTT broker local)
- [ ] GitHub branch created (`esp32-s3-migration`)

---

## Contact & Escalations

- **Architecture Questions:** Reference MINI_PV_CONTROLLER_PLAN.md § 5-6
- **Hardware Issues:** See HARDWARE_SETUP.md § 8
- **Device Protocols:** See DEVICE_REGISTRY.md § 2
- **Mobile Patterns:** See DEVICE_REGISTRY.md § 8

---

**Document Version:** 1.0  
**Prepared:** 2026-05-02  
**For:** Team Kickoff Meeting  
**Next Review:** 2026-05-09 (Week 1 Results)
