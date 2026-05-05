# Mini PV Controller — Implementation Roadmap & Next Steps

**Document Version:** 1.0  
**Date:** 2026-05-02  
**Status:** Ready for Phase 1 Kick-off

---

## Executive Summary

**Decision Made:** Migrate from KC868-A6/ESP32 to **ESP32-S3 DevKitC-1** (16MB Flash, 8MB PSRAM)

**Product Rename:** `KC_PV_DG` → `Mini PV Controller`

**Scope Expansion:**
- Multi-channel Modbus RTU (2 devices simultaneously)
- MQTT + WebSocket real-time telemetry
- Energy history storage (hourly + daily aggregates)
- Professional mobile + web dashboards
- Higher sampling rates (per-second resolution)

**Estimated Timeline:**
- **Phase 1 (Core Migration):** 6-8 weeks
- **Phase 2 (Multi-Inverter + Web):** 6-8 weeks
- **Phase 3 (Production Hardening):** 4-6 weeks
- **MVP Complete:** 3-4 months

**Resource Estimate:** 3-4 full-time engineers

---

## Deliverables Completed (Today)

✅ **MINI_PV_CONTROLLER_PLAN.md** (15-section comprehensive plan)
- Hardware migration strategy
- Telemetry data schema (all fields)
- Multi-channel Modbus architecture
- Energy storage calculations
- Protocol support (MQTT, WebSocket, REST)
- 4-phase implementation roadmap
- Risk mitigation + success criteria
- Gaps & dark areas identified

✅ **HARDWARE_SETUP.md** (9-section hardware guide)
- GPIO pin allocation for ESP32-S3
- RS485 wiring diagrams (single + dual channel)
- Cable specifications & best practices
- BOM + assembly checklist
- Power supply calculations
- Verification & troubleshooting
- Production recommendations

---

## Immediate Action Items (Next 2 Weeks)

### Week 1: Hardware Procurement & Setup

**Tasks:**
- [ ] **Order Hardware** (Deliver in 3-5 days)
  - 3× ESP32-S3 DevKitC-1 boards ($18 each)
  - 4× MAX485 RS485 modules ($4 each)
  - 50m shielded twisted pair cable ($15)
  - 5V / 2A buck converter ($3)
  - Terminators, connectors, housing (~$15)
  - **Total BOM Cost:** ~$150 for 3 dev boards

- [ ] **Set Up Development Environment** (Per developer)
  - Install ESP-IDF v5.2 (from esp-idf GitHub)
  - Verify ESP32-S3 USB-Serial driver (macOS: auto, Linux: libusb, Windows: CH340 driver)
  - Clone KC_PV_DG repo + check out new branch `esp32-s3-migration`
  - Test build: `idf.py set-target esp32s3 && idf.py build`

- [ ] **Create Project Structure**
  ```
  mkdir firmware/esp32-s3/main
  mkdir web-dashboard
  mkdir cloud-bridge
  cp firmware/esp32/main/* firmware/esp32-s3/main/  # (as baseline)
  ```

### Week 2: Hardware Bring-Up & Validation

**Tasks:**
- [ ] **Assemble ESP32-S3 + MAX485 Dev Boards** (Physical)
  - Mount on breadboard or proto PCB
  - Wire UART0 + GPIO 2 to MAX485-A (for grid meter)
  - Wire UART1 + GPIO 21 to MAX485-B (optional, test later)
  - Connect 5V supply, 100µF cap
  - Power on, verify LED + serial output

- [ ] **Test Modbus RTU Loopback** (Firmware)
  - Upload basic UART test to verify GPIO 43, 44 work
  - Loopback test: TX ↔ RX (short via 1kΩ resistor)
  - Verify Modbus CRC calculation with known frames

- [ ] **Verify EM500 Connection** (Hardware + Firmware)
  - Connect real EM500 grid meter to RS485 BUS A
  - Implement basic Modbus polling in firmware
  - Read 1-2 key registers (frequency, total power)
  - Print to serial: `Frequency: 50.05 Hz, Power: 3427 W`

- [ ] **Document GPIO Pinout & Hardware Layout**
  - Create spreadsheet: GPIO number → function → connected device
  - Take photos of working breadboard setup
  - Write up verification procedures (see HARDWARE_SETUP.md)

---

## Phase 1 Kickoff Plan (Weeks 3-8)

### Firmware Development (ESP32-S3)

**Subtask 1: Multi-Channel Modbus Manager (Week 3-4)**
- Implement `modbus_manager.c`:
  - Abstract multi-UART orchestration
  - Queue-based polling (UART0 → EM500, UART1 → Inverter1)
  - Error handling + retry logic
  - Timeout management (1-2s per device)
- Create `inverter_protocol.c`:
  - Inverter-specific Modbus registers (start with 1 brand: Huawei OR SMA)
  - Parse AC/DC/PV fields
  - Convert raw registers to engineering units (kW, V, °C, etc.)
- Create `meter_protocol.c`:
  - EM500 register mapping (already partially done)
  - Frequency, power, energy, harmonic distortion
  - Multi-phase support (L1, L2, L3)

**Deliverable:**
- Firmware compiles without warnings
- Reads both EM500 + Inverter simultaneously
- JSON snapshot includes all fields from telemetry schema
- Modbus error rate < 0.5% over 1-hour test

**Success Metric:**
- Serial output shows live grid + inverter data every 1 second
- No UART conflicts or data corruption

---

**Subtask 2: Energy Storage & History (Week 4-5)**
- Implement `energy_storage.c`:
  - Initialize LittleFS on flash partition (10-14MB)
  - Ring buffer for 1-minute aggregates (10-14 days @ 1440 records/day)
  - Hourly aggregation logic (shift from 1-min to hourly)
  - Persistence across reboots
- Implement `telemetry_collector.c`:
  - Accumulate energy values
  - Calculate daily totals (at midnight UTC)
  - Compute running averages (Pav over 5-min windows)

**Deliverable:**
- Energy history persists after power cycle
- `/api/v1/energy/history?range=24h` returns hourly aggregates
- Storage validation: can store 14 days @ 1440 samples/day without fragmentation

**Success Metric:**
- 24-hour continuous operation: memory does not grow unbounded
- NVS wear-leveling: <1000 erase cycles over 1 month

---

**Subtask 3: MQTT Client (Week 5)**
- Integrate `esp-mqtt` component (already in ESP-IDF)
- Implement `mqtt_client.c`:
  - Auto-connect to local WiFi + broker
  - Publish snapshots every 1-2 seconds to `mini-pv/{device_id}/telemetry/*`
  - Subscribe to `mini-pv/{device_id}/command/*` for inbound control (future)
  - Reconnect logic (exponential backoff)
  - TLS support (optional for phase 1, defer if time-constrained)

**Deliverable:**
- MQTT client connects to Mosquitto on development machine
- Receives 100+ snapshots/min without connection drops
- Payloads ~2-3KB each

**Success Metric:**
- Home Assistant / Node-RED can subscribe to telemetry topics
- No message drops during WiFi reconnect

---

**Subtask 4: WebSocket Server & REST API Update (Week 5-6)**
- Implement `websocket_server.c`:
  - HTTP upgrade handler (existing HTTP server extended)
  - Frame encoding (simple JSON over text frames)
  - Broadcast snapshot every 1-2 seconds
  - Per-client rate limiting (100 msg/sec max)
- Update `http_server.c`:
  - New REST endpoints: `/api/v1/telemetry/snapshot`, `/api/v1/energy/history?range=24h`
  - Response compression (gzip for large JSON)
  - CORS headers for web dashboard

**Deliverable:**
- `curl http://192.168.4.1/api/v1/telemetry/snapshot` returns full JSON
- Browser WebSocket client receives 1 snapshot/sec
- Web dashboard (React) can subscribe and update UI in real-time

**Success Metric:**
- 10 concurrent WebSocket clients, 1 snapshot/sec each: <5% CPU overhead
- No memory leaks after 24h of continuous connections

---

### Mobile App Updates (Android)

**Subtask 1: Project Rename & Discovery (Week 3)**
- Rename package: `com.kc.pvdg` → `com.minipv.controller`
- Update UI branding: logos, colors, app name
- Enhance discovery: show available devices in range
- Multi-device support: list of recent controllers

**Deliverable:**
- Android app builds without errors
- APK installable on emulator + physical device
- Can discover controller in AP mode

---

**Subtask 2: Live Dashboard Overhaul (Week 4-5)**
- Redesign UI for energy flow visualization:
  - Central power flow diagram (animated SVG or Canvas)
  - Grid ↔ PV ↔ Battery ↔ Load flows
  - Real-time power values updated every 1-2 seconds
  - Inverter status cards (multiple inverters on tabs)
  - Alarms ribbon (swipe-to-acknowledge)
- Upgrade telemetry display:
  - Show AC/DC/PV separately
  - String temps if available
  - Efficiency % calculation

**Deliverable:**
- Live dashboard shows grid + inverter data without manual refresh
- Energy flow diagram is visually professional
- Acceptable to end user (no placeholder UI)

**Success Metric:**
- Demo to stakeholder: recognizable as commercial product
- Responsive to 1-sec snapshot updates (smooth animations, no jank)

---

**Subtask 3: Energy History View (Week 5-6)**
- Add Energy History tab to mobile app
- UI shows 3 time scales: 24h (1-min), 7d (hourly), 30d (daily)
- Interactive chart: tap to see power breakdown by source
- Export: share CSV via email/cloud
- Offline caching: store recent history locally

**Deliverable:**
- User can view energy production over past 30 days
- Charts render smoothly without lag
- Export format is Excel-friendly (CSV with headers)

---

### Testing & Validation (Week 6-8)

**Integration Tests:**
- [ ] Firmware + real EM500 + real Inverter (24-hour soak test)
- [ ] Mobile app pairing + live telemetry + energy history
- [ ] MQTT broker receives all snapshots without drops
- [ ] WebSocket survives WiFi disconnect + reconnect
- [ ] OTA firmware update (placeholder for phase 2)

**Performance Benchmarks:**
- [ ] Modbus polling latency: <100ms per device
- [ ] HTTP `/telemetry/snapshot` response: <50ms
- [ ] Memory leak test: heap stable after 72h
- [ ] Energy calculation accuracy vs. manual meter

**UI/UX Review:**
- [ ] Energy flow diagram clarity (stakeholder approval)
- [ ] Mobile app performance on low-end Android devices
- [ ] Accessibility: button sizes, font sizes, contrast ratios

---

## Phase 1 Success Criteria (End of Week 8)

✅ **Firmware:**
- [ ] Dual-channel Modbus (EM500 + Inverter) working simultaneously
- [ ] Energy history persists (24h minimum)
- [ ] MQTT + WebSocket clients receive snapshots at 1 Hz
- [ ] Binary size < 8MB (OTA compatible)
- [ ] Modbus error rate < 0.1% over extended test

✅ **Mobile App:**
- [ ] Live dashboard shows grid + inverter + alarms
- [ ] Pairing + WiFi provisioning work end-to-end
- [ ] Energy history accessible (24h, 7d, 30d views)
- [ ] App runs on Android 11+ without crashes

✅ **Hardware:**
- [ ] Breadboard prototype stable (no cold-solder issues)
- [ ] GPIO allocation verified (no conflicts)
- [ ] RS485 cabling meets noise specs

✅ **Documentation:**
- [ ] API spec finalized (all endpoints documented)
- [ ] Telemetry schema frozen (versioned)
- [ ] Hardware setup guide complete + verified

---

## Critical Decisions Required Before Kickoff

| Decision | Options | Recommendation | Owner | Deadline |
|---|---|---|---|---|
| **Primary Inverter Brand** | Huawei / SMA / Growatt / Solax | Start with **Huawei** (largest market share) | Product | Week 1 |
| **Battery Support Phase** | Phase 1 / Phase 2 / Defer | Defer to Phase 2 (scope reduction) | Product | Week 1 |
| **MQTT Cloud Broker** | Local only / Cloud (AWS/Azure) | Local only Phase 1, cloud optional Phase 3 | Ops | Week 1 |
| **Web Dashboard Framework** | React / Vue / Svelte | **React + Next.js** (team familiarity) | Tech Lead | Week 2 |
| **Temperature Sensor** | DS18B20 / Inverter native / Skip | **Inverter native** (no extra hardware) | Hardware | Week 2 |
| **Modbus-TCP Alternative** | RS485 multi-channel / Ethernet gateway | **RS485 multi-channel** (simpler Phase 1) | Arch | Week 2 |

---

## Known Risks & Mitigations

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| ESP32-S3 GPIO conflicts (UART0 vs. Flash) | Firmware won't build | Verify pinout early (Week 1 spike) | Firmware Lead |
| Modbus RTU noise on long cables | Data corruption, dropouts | Use shielded pair + ferrite (HW design) | Hardware |
| Inverter Modbus registers differ by firmware version | Wrong data parsing | Build feature flags + test harness (FW design) | Firmware Lead |
| Mobile app UI not professional enough | Stakeholder rejection | Hire design consultant OR use templates (Week 3) | Product |
| Energy storage fills up quickly | Crash after 10 days | Pre-calculate storage requirements (already done) | Firmware |
| WiFi reconnects cause telemetry gaps | Alarms missed | Implement offline queueing + cloud sync (Phase 3) | Firmware |

---

## Communication & Handoff Plan

### Weekly Standups
- **Monday 9am:** Status + blockers (15 min)
- **Friday 3pm:** Demo + planning (30 min)

### Documentation
- Commit all code docs to GitHub wiki
- Update this roadmap weekly (check actual vs. planned)
- Decision log: GitHub discussions (link to this doc)

### Stakeholder Updates
- **Week 2:** Hardware photos + architecture review
- **Week 4:** Mobile app UI demo + energy history preview
- **Week 6:** End-to-end integration test results
- **Week 8:** Phase 1 demo (all devices working live)

---

## Appendix: Document Cross-References

**Main Planning Documents:**
1. [MINI_PV_CONTROLLER_PLAN.md](MINI_PV_CONTROLLER_PLAN.md) — Full 15-section plan
2. [HARDWARE_SETUP.md](HARDWARE_SETUP.md) — GPIO, wiring, BOM, troubleshooting

**Related Documents (Existing):**
- [Plan_updated.md](Plan_updated.md) — Legacy KC868-A6 plan (superseded)
- [KC_PV_DG_FACTS.md](KC_PV_DG_FACTS.md) — Current hardware facts (update needed)

**To Be Created:**
- API_SPECIFICATION.md (Phase 1, Week 4)
- TELEMETRY_SCHEMA.md (Phase 1, Week 3)
- MODBUS_REGISTER_MAPS.md (Phase 1, Week 3, per brand)
- TESTING_PLAN.md (Phase 1, Week 5)
- SECURITY_REVIEW.md (Phase 3, Week 12)

---

## Questions & Discussion Points

**For Product Team:**
1. Which inverter brands are highest priority? (Huawei, SMA, Growatt?)
2. Is battery support needed in Phase 1? (Scope impact: +3 weeks)
3. Should cloud integration be local-first or cloud-first?
4. Target geographic regions? (Affects regulatory requirements)

**For Hardware Team:**
1. Do we have physical access to EM500 + Inverter for testing?
2. Space constraints for enclosure? (Will affect final PCB design)
3. Temperature/humidity range for deployment?

**For Mobile/Web Team:**
1. Design assets / brand guidelines available?
2. Target Android version? (We assume Android 11+)
3. Offline-first requirements for mobile?

---

**Document Version:** 1.0  
**Created:** 2026-05-02  
**Review Schedule:** Weekly (Fridays)  
**Next Update:** 2026-05-09 (after Week 1 kickoff)
