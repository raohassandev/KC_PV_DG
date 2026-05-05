# Mini PV Controller — ESP32-S3 Migration & Feature Plan

**Status:** v1.0 Planning  
**Last Updated:** 2026-05-02  
**Hardware Target:** ESP32-S3 DevKitC-1 (16MB Flash, 8MB PSRAM)  
**Product Name:** Mini PV Controller  

---

## 1. Hardware Architecture

### ESP32-S3 Advantages Over KC868-A6
| Aspect | KC868-A6/ESP32 | ESP32-S3 | Benefit |
|--------|---|---|---|
| Flash | 4MB | 16MB | 4× energy history storage |
| PSRAM | None | 8MB | Real-time buffer, telemetry queue |
| USB | Serial (UART) | Native USB-OTG | Direct flash + debug |
| Cores | 2 × 160MHz | 2 × 240MHz | 50% faster processing |
| ADC Channels | Limited | 20 GPIO SAR ADC | Direct sensor inputs |
| GPIO | 34 (limited I/O) | 45+ | Flexible expansion |
| Cost | Higher | ~$15-20 | Better ROI |

### Multi-Channel Modbus Design

**Architecture: Multiple Devices per RS485 Port (Slave IDs)**

Each RS485 port can support up to 247 devices using Modbus slave addressing. Devices are identified by:
- **Slave ID (1-247)** — unique per device on the same RS485 network
- **Protocol** — RTU (binary) or TCP/IP (Ethernet alternative)
- **Baud rate** — typically 9600 bps for all devices on same bus

**Phase 1 Hardware Layout:**
- **RS485 Port A (UART0):** Multiple meters/inverters via slave IDs
  - Slave ID 1: Grid meter (Rozwell EM500 or WM15 Gavazzi)
  - Slave ID 2: Secondary meter (optional)
  - Slave ID N: Additional devices
- **RS485 Port B (UART1):** Optional second RS485 network (separate slave ID space)
  - Useful for separating grid meters from inverters (noise isolation)
  - OR: Secondary site with independent devices

**Dynamic Protocol Selection (Per-Device Config):**

Each meter/inverter can be configured to use:
1. **Modbus RTU** — via RS485 Port A or B (recommended, low latency)
2. **Modbus TCP/IP** — via Ethernet gateway (PUSR DR302 or similar) if RS485 unavailable
   - Adds ~50-100ms latency
   - Useful for remote locations or noise-sensitive installations
   - Device config stores: protocol type + gateway IP:port

**Polling Strategy (High-Frequency):**
- Stagger slave IDs to prevent Modbus collisions
- Poll each device every 500-1000ms (target: ≥1/sec per device)
- Adaptive frequency: increase to 2-5/sec for AC power only if RTT < 100ms
- Timeout: 500ms per request, retry once before marking offline

### GPIO Allocation (ESP32-S3)

```
UART0 (RS485 Port A):  GPIO 1 (TX), GPIO 3 (RX), GPIO 2 (DE/RE)
                       → Multiple slaves via slave IDs (grid meter, meter 2, etc.)
UART1 (RS485 Port B):  GPIO 17 (TX), GPIO 18 (RX), GPIO 21 (DE/RE)
                       → Optional: second independent RS485 network
SPI (Ethernet opt):    GPIO 12 (MOSI), GPIO 13 (MISO), GPIO 14 (CLK), GPIO 15 (CS)
                       → W5500 module (if Modbus TCP/IP gateway needed)
LED/Status:            GPIO 46, GPIO 0
ADC (Future):          GPIO 1-7 (SAR ADC channels, reserved)
```

---

## 2. Project Structure & Rename

### Folder Restructure

```
mini-pv-controller/                  ← Renamed from KC_PV_DG
├── firmware/
│   ├── esp32/                        ← Remove (legacy)
│   ├── esp32-s3/                     ← NEW: ESP32-S3 custom firmware
│   │   ├── main/
│   │   │   ├── modbus_manager.c      ← Multi-channel orchestrator
│   │   │   ├── modbus_rtu_multi.c    ← New dual-channel RTU
│   │   │   ├── inverter_protocol.c   ← Inverter-specific handlers
│   │   │   ├── meter_protocol.c      ← Meter-specific handlers
│   │   │   ├── mqtt_client.c         ← MQTT integration
│   │   │   ├── websocket_server.c    ← WebSocket real-time push
│   │   │   ├── energy_storage.c      ← Ring buffer for history
│   │   │   ├── telemetry_collector.c ← High-freq sampling
│   │   │   ├── http_server.c         ← REST API
│   │   │   └── ...
│   │   ├── sdkconfig.esp32s3         ← ESP32-S3 config
│   │   └── CMakeLists.txt
│   └── firmware_core/                ← Keep (shared logic)
├── mobile/                           ← Android app (rename package)
├── web-dashboard/                    ← NEW: Web UI (React/Next.js)
├── cloud-bridge/                     ← NEW: Optional cloud sync
├── docs/
│   ├── MINI_PV_CONTROLLER_PLAN.md   ← This file
│   ├── HARDWARE_SETUP.md             ← GPIO, wiring, connections
│   ├── TELEMETRY_SCHEMA.md           ← All data points
│   ├── MODBUS_REGISTER_MAP.md        ← Device registers
│   └── ...
└── package.json                      ← Update to "mini-pv-controller"
```

### Package.json Updates

```json
{
  "name": "mini-pv-controller",
  "version": "2.0.0-beta.1",
  "description": "Distributed PV-DG controller with multi-source energy management",
  "private": true,
  "workspaces": [
    "firmware/esp32-s3",
    "mobile",
    "web-dashboard",
    "dynamic_zero_export"
  ]
}
```

---

## 3. Telemetry Architecture

### Collection Frequencies (Optimized for Minimal Latency)

| Data Point | Source | Target Frequency | Adaptive | Storage |
|---|---|---|---|---|
| **Grid/Meter AC** | Modbus RTU Port A | **2/sec** (1000ms) | ↑5/sec if RTT <100ms | Ring buffer (6h) |
| **Inverter AC** | Modbus RTU Port A/B | **2/sec** (1000ms) | ↑5/sec if RTT <100ms | Ring buffer (6h) |
| **Inverter DC** | Modbus RTU Port A/B | **2/sec** (1000ms) | ↑5/sec if RTT <100ms | Ring buffer (6h) |
| **String Voltage/Current** | Inverter Modbus | **2/sec** (if separate poll) | ↑5/sec if time permits | Sampled 1/5s |
| **String Temps** | Inverter Modbus | **1/sec** (lower priority) | Batch with AC data | Sampled 1/10s |
| **Inverter Alarms** | Inverter Modbus | Polled **1/sec**, event-driven on change | N/A | Persistent NVS |
| **Energy Accum** | Calculated from AC | **2/sec** (updates per snapshot) | N/A | Persisted every 10s |
| **System Health** | FreeRTOS metrics | **1/min** | N/A | Ring buffer (7d) |

**Modbus Bus Utilization Strategy:**
- Each slave takes ~50-100ms per request (Modbus RTU overhead)
- Port A example: 2 devices × 100ms = 200ms per cycle → 5 cycles/sec possible
- Stagger polls: Device A at T=0, Device B at T=100ms → both update 5/sec without conflict
- Adaptive: if RTT > 200ms detected, scale back to 2/sec automatically

### Data Schema (Telemetry Snapshot)

```typescript
interface MiniPVTelemetry {
  timestamp: number;              // Unix ms
  device_id: string;
  
  // Grid/Meter (EM500 or similar)
  grid: {
    frequency_hz: number;
    voltage_rms_v: number;
    current_a: number;
    active_power_w: number;
    reactive_power_var: number;
    apparent_power_va: number;
    power_factor: number;
    phase_angle: number;
    active_energy_import_kwh: number;   // Total import (lifetime)
    active_energy_export_kwh: number;   // Total export (lifetime)
    reactive_energy_import_kvarh: number;
    reactive_energy_export_kvarh: number;
    thd_voltage_percent: number;
    thd_current_percent: number;
  };
  
  // Primary Inverter (Modbus)
  inverter: {
    device_id: string;
    online: boolean;
    last_update_ms: number;
    
    ac: {
      frequency_hz: number;
      voltage_ab_v: number;
      voltage_bc_v: number;
      voltage_ca_v: number;
      current_a_amp: number;
      current_b_amp: number;
      current_c_amp: number;
      active_power_w: number;
      reactive_power_var: number;
      apparent_power_va: number;
      power_factor: number;
      efficiency_percent: number;
    };
    
    dc: {
      voltage_v: number;
      current_a: number;
      power_w: number;
      mpp_voltage_v: number;
      mpp_current_a: number;
    };
    
    pv: {
      strings: Array<{
        id: number;                      // 1, 2, 3, ...
        voltage_v: number;
        current_a: number;
        power_w: number;
        temperature_c: number;
        irradiance_w_m2: number;
        health_percent: number;          // Based on Voc/Vmpp
      }>;
      total_power_w: number;
      irradiance_avg_w_m2: number;
      temperature_avg_c: number;
    };
    
    // Battery: NOT SUPPORTED IN PHASE 1
    // Reserved for future use (out of current MVP scope)
    
    alarms: Array<{
      code: number;
      name: string;
      severity: 'info' | 'warning' | 'error' | 'critical';
      timestamp: number;
      cleared_at?: number;
    }>;
    
    energy_today_kwh: number;
    energy_lifetime_kwh: number;
  };
  
  // Secondary Inverter/Meter (optional)
  inverter_2?: {
    // Same structure as inverter
  };
  
  // Aggregated Energy View
  energy_analysis: {
    pv_generated_w: number;             // Current PV output
    grid_imported_w: number;            // Positive = import
    battery_power_w: number;            // Positive = discharge
    load_power_w: number;               // Total consumption
    export_power_w: number;             // Positive = export
    
    today: {
      pv_generated_kwh: number;
      grid_imported_kwh: number;
      grid_exported_kwh: number;
      battery_charged_kwh: number;
      battery_discharged_kwh: number;
      self_consumption_percent: number;
      import_substitution_percent: number;
    };
    
    lifetime: {
      pv_generated_kwh: number;
      grid_imported_kwh: number;
      grid_exported_kwh: number;
      co2_avoided_kg: number;
    };
  };
  
  // System Health
  system: {
    uptime_seconds: number;
    heap_free_bytes: number;
    heap_total_bytes: number;
    psram_free_bytes: number;
    psram_total_bytes: number;
    wifi_rssi_dbm: number;
    cpu_temp_c: number;
    modbus_errors_total: number;
    http_requests_total: number;
  };
}
```

---

## 4. Energy History Storage Strategy

### Storage Allocation (ESP32-S3: 16MB Flash)

```
Partition Layout:
├── Bootloader         (0-64KB)
├── App OTA slot 1     (65KB-4MB)
├── App OTA slot 2     (4MB-8MB)
├── NVS (config)       (8MB-9MB)    ← Device config, pairing, site
├── NVRAM (logs)       (9MB-10MB)   ← Event/error logs
├── Energy History     (10MB-14MB)  ← Ring buffers
├── Spare/Future       (14MB-16MB)
```

### Ring Buffer Implementation (4MB = ~10MB NVS LFS)

Using **LittleFS** or **FATFS** overlay on flash:

**1-Minute Aggregation (10 days @ 4MB):**
```
{
  timestamp: number,
  pv_generation_kwh: number,
  grid_import_kwh: number,
  grid_export_kwh: number,
  battery_charge_kwh: number,
  battery_discharge_kwh: number,
  load_consumption_kwh: number,
}
// ~30 bytes/record × 1440 min/day × 10 days = 432KB (safe margin)
```

**Hourly Aggregation (90 days @ 1MB):**
```
{
  timestamp: number,
  pv_generation_kwh: number,
  grid_import_kwh: number,
  grid_export_kwh: number,
  battery_charge_kwh: number,
  battery_discharge_kwh: number,
  load_consumption_kwh: number,
  max_pv_power_w: number,
  avg_pv_power_w: number,
  alarms_count: number,
}
// ~40 bytes/record × 24 hours × 90 days = 86.4KB (easily fits)
```

**Daily Aggregation (2+ years @ 500KB):**
```
{
  date: string,
  pv_generation_kwh: number,
  grid_import_kwh: number,
  grid_export_kwh: number,
  battery_charge_kwh: number,
  battery_discharge_kwh: number,
  load_consumption_kwh: number,
  self_consumption_percent: number,
}
// ~60 bytes × 365 × 2 = 43.8KB (1KB/year)
```

### Data Export & Cloud Sync

- **Local JSON export** via API: `/api/v1/energy/export?range=2026-04-01..2026-05-02`
- **Cloud bridge** (optional Node.js service):
  - Sync on WiFi + connected condition
  - Batch upload every 6 hours
  - Encryption in transit
  - Versioned schema for backward compatibility

---

## 5. Device Adapter & Multi-Protocol Support

### Supported Devices & Protocols

**Phase 1 (MVP) Device Support:**

| Type | Brand/Model | Protocol | Status | Notes |
|------|---|---|---|---|
| **Meter** | Rozwell EM500 | Modbus RTU | ✅ Implemented | 3-phase grid meter |
| **Meter** | Carlo Gavazzi WM15 | Modbus RTU | 🔧 Phase 1 | Power quality analyzer |
| **Inverter** | Huawei Sun2000 | Modbus RTU | 🔧 Phase 1 | Multi-string, AC/DC/temps |
| **Gateway** | PUSR DR302 | Modbus TCP/IP | 🔄 Optional | Fallback for RS485-unavailable sites |

**Device Discovery & Configuration:**
- Firmware scans configured slave IDs (1-247) on each RS485 port
- Device type auto-detection: reads manufacturer ID + model
- Registers match against brand adapter registry
- Config stored in NVS: `device[N] = {port, slave_id, protocol, brand}`

**Adapter Registry (TypeScript + C):**

Existing pattern in `dynamic_zero_export/adapters/brand-profiles/`:
```typescript
interface BrandProfile {
  id: string;                          // "huawei", "gavazzi_wm15", "rozwell_em500"
  name: string;
  registers: {
    [field: string]: {
      address: number;
      count: number;
      type: 'U16' | 'S16' | 'U32' | 'S32' | 'F32' | 'F64';
      scale: number;                  // e.g., 0.01 for W → kW
      parse?: (raw: number[]) => number;
    };
  };
  alarmCodes: Record<number, string>;
}
```

Firmware equivalent (C structs in modbus_device.h).

**Temperature Data Source:**
- **NO physical temperature sensors** — All temps read via Modbus
- Huawei: String temps via Modbus registers (one per string)
- WM15: Ambient temp + phase temps (if available)
- Rozwell EM500: No temperature data (meter only)

---

## 6. Communication Protocols

### MQTT Integration

**Broker Connection:**
- Local MQTT broker (Mosquitto) on home WiFi or optional cloud
- TLS 1.2 support
- Reconnect with exponential backoff
- QoS 1 for telemetry, QoS 2 for commands

**Topic Structure:**
```
mini-pv/{device_id}/telemetry/grid      ← Grid meter snapshot
mini-pv/{device_id}/telemetry/inverter  ← Inverter snapshot
mini-pv/{device_id}/telemetry/energy    ← Energy analysis
mini-pv/{device_id}/telemetry/system    ← System health
mini-pv/{device_id}/alarms/+             ← Real-time alarms
mini-pv/{device_id}/command/+            ← Inbound commands
mini-pv/{device_id}/status/connection    ← Connection status
```

**Payload Size Optimization:**
- Compress floats to 2-4 decimal places
- Use CBOR or msgpack for binary payloads
- Target ~2-3KB per snapshot

### WebSocket Server

**Real-time Dashboard Push:**
- HTTP upgrade to WebSocket on `/ws/telemetry`
- Publish telemetry snapshot every 1-2 seconds
- Event-driven alarms
- Energy history on-demand (fetch via REST + WebSocket backfill)

**Message Format:**
```json
{
  "type": "snapshot",
  "timestamp": 1714732800000,
  "grid": {...},
  "inverter": {...},
  "energy_analysis": {...}
}
```

### REST API Endpoints

**Core v1 API:**
```
GET    /api/v1/device/info              ← Device identity, capabilities
POST   /api/v1/device/pair              ← Pairing token
POST   /api/v1/device/provision-wifi    ← WiFi setup
GET    /api/v1/site/config              ← Current site config
PUT    /api/v1/site/config              ← Update config
GET    /api/v1/telemetry/snapshot       ← Current live state
GET    /api/v1/telemetry/stream         ← Event-driven SSE
WS     /ws/telemetry                    ← Real-time WebSocket
GET    /api/v1/energy/history           ← Hourly/daily aggregates
GET    /api/v1/energy/export            ← JSON/CSV export
GET    /api/v1/alarms/history           ← Recent alarms
GET    /api/v1/inverter/{id}/config     ← Inverter-specific config
PUT    /api/v1/inverter/{id}/config     ← Update inverter config
GET    /api/v1/system/diagnostics       ← System health
POST   /api/v1/system/ota               ← Firmware update
GET    /api/v1/system/logs              ← Recent event logs
```

---

## 7. UI/UX Redesign Requirements

### Mobile (Android) — Commissioning & Real-time Monitoring

**Key Screens:**
1. **Discovery & Pairing**
   - Scan WiFi for controller AP
   - Manual IP entry
   - Token-based pairing
   - Multi-device support (discovery list)

2. **Live Dashboard**
   - Grid: power, voltage, frequency, THD
   - Inverter 1 & 2: AC/DC power, efficiency, temps
   - PV strings: individual voltages, temps, health
   - Energy flow diagram (animated)
   - Alarms ribbon at top (swipe to acknowledge)

3. **Energy History**
   - Toggle: 1-min / hourly / daily views
   - Separate charts per source (Grid, PV, Battery, Load)
   - Date range picker
   - Export to CSV

4. **Inverter Health**
   - Per-inverter AC/DC metrics
   - String temperature monitoring
   - Alarm history + clear buttons
   - Firmware version + update button

5. **Configuration**
   - Site name, grid voltage, max export
   - WiFi provisioning
   - Modbus device discovery
   - Role-based access (owner, installer, support)

### Web Dashboard (React/Next.js) — Executive Analysis

**Key Screens:**
1. **Overview**
   - Real-time power flow (animated SVG)
   - Daily/monthly/yearly energy summaries
   - KPI cards: self-consumption %, carbon avoided, ROI
   - Responsive grid layout

2. **Inverter Management**
   - Multi-inverter status table
   - Per-inverter drill-down (AC/DC/PV breakdown)
   - Alarm history with PDF export
   - Firmware update scheduling

3. **Energy Analytics**
   - Advanced charts: multiple Y-axes, stacked areas
   - Filters: date range, source, load type
   - Predictive badges: "High export expected tomorrow"
   - Hourly heatmap (power vs. time-of-day)

4. **System Health**
   - Device uptime, memory usage, modbus error rates
   - Event logs with full-text search
   - OTA update history
   - Backup & restore config

5. **Integration Panel**
   - MQTT broker connection status
   - Cloud sync (if enabled)
   - API token management
   - Third-party app permissions

---

## 8. Implementation Phases

### Phase 1: Core Migration (6-8 weeks)

**Goals:**
- ESP32-S3 hardware working
- Single-channel Modbus (grid meter + 1 inverter)
- REST API + MQTT basics
- Android app updated

**Deliverables:**
1. Firmware (`esp32-s3/main/`):
   - ESP32-S3 target config + pinout
   - Dual UART initialization (channels A, B)
   - Modbus RTU manager with multi-device polling
   - NVS storage for history
   - MQTT client (basic pub/sub)
   - WebSocket server (snapshot push)
   - HTTP API (core endpoints)

2. Mobile:
   - Rename package to `com.minipv.controller`
   - Discovery + pairing flow
   - Live dashboard (grid + 1 inverter)
   - Energy history basic view

3. Documentation:
   - Hardware setup guide (GPIO, wiring)
   - Telemetry schema finalized
   - Modbus register maps for each device

**Success Metrics:**
- Grid meter + inverter readings live on Android every 1s
- Energy history persists across reboots
- WebSocket client can subscribe and receive snapshots
- MQTT publishes to local broker
- ~8MB firmware binary (fits OTA slot)

### Phase 2: Multi-Inverter & Advanced Telemetry (6-8 weeks)

**Goals:**
- Dual-inverter support
- String-level data + temps
- Energy storage per source
- Web dashboard MVP

**Deliverables:**
1. Firmware:
   - Multi-inverter polling orchestration
   - String telemetry collection (per-inverter)
   - Temperature sensor integration (I2C/1-Wire)
   - Ring buffer energy aggregation (1-min, hourly, daily)
   - Enhanced alarm handling (alarm history + persistence)
   - Config schema for multiple inverters

2. Mobile:
   - Multi-inverter tabs
   - String temperature heatmap
   - Alarm history + acknowledge
   - Energy history (3 time scales)

3. Web Dashboard:
   - React scaffolding (Next.js)
   - Live power flow diagram
   - Inverter status cards
   - Basic energy charts
   - System diagnostics page

4. Cloud Bridge (Node.js, optional):
   - Sync engine (REST client → cloud storage)
   - Batch upload scheduler
   - Encryption/auth

**Success Metrics:**
- 2 inverters + 1 grid meter polled simultaneously without blocking
- String temps update every 2-5s
- Alarms persist across reboots + acknowledge state
- Web dashboard shows live 10s updates
- 4MB energy history stored (10 days @ 1-min granularity)

### Phase 3: Production Hardening & Scalability (4-6 weeks)

**Goals:**
- OTA firmware updates
- Error resilience (watchdog, auto-recovery)
- Performance optimization
- Security audit

**Deliverables:**
1. Firmware:
   - OTA partition management + rollback
   - Watchdog timer + fault recovery
   - Modbus error retry logic + circuit breaker
   - Heap fragmentation mitigation
   - TLS certificate management for MQTT
   - Performance profiling (CPU/memory logging)

2. Mobile & Web:
   - OTA update UI
   - Offline-first caching
   - Role-based access enforcement
   - Accessibility (WCAG 2.1 AA)
   - Load testing (100+ concurrent WebSocket clients)

3. Testing:
   - Integration tests (firmware + inverter simulator)
   - UI test coverage (Cypress/Playwright)
   - Long-run stability (72h continuous operation)
   - Modbus error injection tests

**Success Metrics:**
- Firmware survives 30 days without manual reset
- OTA updates complete in <2 min with full rollback capability
- 10% CPU headroom under full load
- MQTT/WebSocket handles 50+ subscriptions without lag
- Security audit findings < 3 high-severity issues

### Phase 4: Ecosystem & Advanced Features (Ongoing)

**Goals:**
- Multi-protocol support (Sunsynk, Victron, etc.)
- Cloud integration (optional but seamless)
- Mobile app stores (Google Play, F-Droid)
- Community integrations (Home Assistant, etc.)

**Deliverables:**
- Generic Modbus device discovery
- Brand-neutral adapter registry
- Home Assistant integration (via MQTT)
- Cloud dashboard (SaaS option)
- iOS app port (React Native)

---

## 9. Gaps & Dark Areas

### High Priority (Must Address)

1. **Inverter-Specific Modbus Protocols**
   - ❌ Each brand has different register offsets, alarm codes, parsing logic
   - Action: Build complete register map + test harness for each brand in scope
   - Effort: 2-3 weeks per brand

2. **String-Level Temperature Data**
   - ✅ **DECISION MADE:** Read ONLY from inverter Modbus registers
   - NO physical temperature sensors (no DS18B20, no 1-Wire)
   - Huawei exposes string temps in Modbus (register per string)
   - Fallback: if unavailable, omit temp data (acceptable for Phase 1)
   - Action: Implement Huawei string temp parsing in Modbus adapter

3. **Energy Accuracy Under Rapid Changes**
   - ❌ Meter refresh rate (1/sec) may miss fast ramps (grid export spikes)
   - Action: Increase Modbus poll frequency to 5-10/sec for AC power only
   - Risk: Modbus bus overload if 3+ devices on same line

4. **Multi-Inverter Synchronization**
   - ❌ How to handle 2 inverters with different poll rates?
   - Action: Implement time-aligned polling (all start at T=0, stagger reads)
   - Risk: Snapshot timestamp drift across sources

5. **Alarm Deduplication**
   - ❌ Same physical fault may appear as multiple alarm codes across devices
   - Action: Build alarm correlation engine in firmware or mobile
   - Effort: 1-2 weeks for production quality

### Medium Priority (Should Address)

6. **Battery System Integration**
   - ❌ **OUT OF SCOPE** — No battery support in Phase 1
   - Rationale: Single-bus PV + Grid DZE only (no storage needed)
   - Future: Reserved for Phase 2+ if multi-source hybrid required
   - Reserved fields in telemetry schema (keep for future compatibility)

7. **Load Estimation (No Load Meter)**
   - ❌ Without a dedicated load meter, load = PV + Grid - Battery
   - Issue: Negative load with high export + low PV = inaccurate
   - Action: Implement virtual load estimation + accept ±5% error margin

8. **Multi-Device RS485 Bus Architecture**
   - ✅ **ACCEPTED:** Multiple devices per RS485 port via slave IDs (1-247)
   - Safety: Stagger polls (no collisions), add timeout/retry logic
   - Isolation option: Use dual ports (A for meters, B for inverters) if noise observed
   - Production: Shielded twisted pair + ferrite chokes (standard practice)
   - Action: Test with 2 devices on Port A (meter + inverter), validate CRC/timeout

9. **Web Dashboard Deployment**
   - ❌ Where to host? Device-local vs. cloud vs. hybrid?
   - Action: Serve from device (static React build + gzip compression)
   - Challenge: 500KB+ React bundle + 2-3MB history = ~4MB total (fits)

10. **Mobile App Distribution**
    - ❌ APK signing, Play Store metadata, F-Droid compliance
    - Action: Set up CI/CD (GitHub Actions) for APK builds
    - Timeline: 1 week for setup + testing

### Low Priority (Nice to Have)

11. **Predictive Analytics**
    - 🔮 Weather API integration for PV forecast
    - 🔮 ML-based load prediction
    - Status: Post-Phase 3

12. **Home Assistant / OpenHAB Integration**
    - ✅ Fully possible via MQTT autodiscovery
    - Status: Phase 4 (documentation only)

13. **Grafana + InfluxDB Stack**
    - 🔮 External time-series DB for advanced analytics
    - Status: Cloud bridge can push to InfluxDB Cloud

14. **Inverter Control Commands**
    - ❌ Set export limit, force charge, etc.
    - Risk: Safety-critical; requires extensive testing + legal review
    - Status: Phase 3+ after stability proven

---

## 10. Hardware Validation Checklist

### ESP32-S3 Bring-Up

- [ ] Verify bootloader + OTA slots (esptool.py read_flash_status)
- [ ] Test USB-Serial (built-in): `ls /dev/ttyACM*` (macOS/Linux) or Device Manager (Windows)
- [ ] GPIO voltage levels (all 3.3V safe)
- [ ] PSRAM functionality (memory test app)
- [ ] Flash read/write speed (benchmark)

### Modbus RTU Multi-Channel

- [ ] MAX485 IC wiring + biasing (120Ω terminator on both ends)
- [ ] RS485 cable shielding (twisted pair, star-point grounding)
- [ ] UART0 & UART1 simultaneous operation (no crosstalk)
- [ ] Modbus RTU CRC calculation (verify with known devices)
- [ ] Baud rate/parity matching (9600/8N1 standard)
- [ ] Error injection test (pull RS485 line to verify error handling)

### MQTT/WebSocket Throughput

- [ ] Publish 100x snapshots/sec to local Mosquitto (no drops)
- [ ] WebSocket accepts 10+ simultaneous clients (measure CPU)
- [ ] Reconnection after network flap (WiFi AP loss + rejoin)
- [ ] Heap stability (no leaks after 24h sustained load)

### Energy Storage Persistence

- [ ] Ring buffer survives power loss (brownout test)
- [ ] NVS data integrity after 1000+ erase/write cycles
- [ ] LittleFS/FATFS mount validation (corruption recovery)

---

## 11. Required Development Tools & Setup

### Firmware Development

```bash
# ESP-IDF v5.2+ (ESP32-S3 official support)
git clone --recursive https://github.com/espressif/esp-idf.git
cd esp-idf && git checkout v5.2
./install.sh all
source ./export.sh

# FreeRTOS (included in ESP-IDF)
# libmodbus (Modbus RTU C library)
# mbedTLS (for MQTT TLS)
# esp-mqtt (Espressif's MQTT component)
```

### Mobile Development

```bash
# Android Studio + SDK (API 30+)
# React Native CLI / Expo
npm install -g expo-cli
cd mobile && npm install
```

### Web Dashboard

```bash
# Node.js 18+ LTS
# Next.js 14
# TypeScript
cd web-dashboard && npm install
```

### Cloud Bridge (Optional)

```bash
# Node.js 18+
# Express
# TypeORM
# PostgreSQL or MongoDB
```

---

## 12. Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Modbus RTU noise on long cables | Data corruption, dropouts | Use shielded twisted pair, ferrite chokes, 120Ω terminator |
| Multiple Modbus devices blocking | High latency, missed updates | Stagger polling, use multi-channel, accept eventual consistency |
| Flash wear-out (NVS cycles) | Data loss after 100k-1M cycles | Use wear-leveling, periodic archival to cloud |
| WiFi dropout during OTA | Stuck in DFU mode, bricked device | Implement rollback timeout (auto-revert after 5 min of failed boot) |
| PSRAM fragmentation over time | System reset loops | Profile heap, use static allocation where possible |
| Inverter firmware incompatibility | Unread registers, wrong parsing | Build feature flag + mock testing, document required versions |
| Alarms lost during power cycle | Unnoticed critical faults | Persist alarm state in NVS + publish on reboot |
| WebSocket client DoS | Device CPU 100% | Rate-limit connections (max 20 WS clients), implement backpressure |

---

## 13. Success Criteria by Phase

### Phase 1 Complete When:
- ✅ ESP32-S3 firmware builds and runs (no hard faults)
- ✅ Grid meter + inverter data visible on Android live dashboard
- ✅ Energy snapshot published every 1s to MQTT broker
- ✅ WebSocket client receives 10 consecutive snapshots without lag
- ✅ REST API responds to all core endpoints
- ✅ Firmware binary < 8MB (OTA compatible)

### Phase 2 Complete When:
- ✅ 2 inverters polled simultaneously without blocking
- ✅ String temperature data pushed every 2-5s
- ✅ Energy history persists across 10 power cycles
- ✅ Web dashboard shows live inverter data + energy chart
- ✅ Mobile app displays multi-inverter tabs + alarm history
- ✅ Modbus error rate < 0.1% over 24h sustained test

### Phase 3 Complete When:
- ✅ OTA firmware update succeeds + rollback works
- ✅ 72-hour continuous operation without manual reset
- ✅ Security audit finds < 3 high-severity issues
- ✅ UI/UX accessibility score ≥ 90 (Lighthouse)
- ✅ Load test: 50+ WebSocket clients, 10x telemetry rate, < 20% CPU

### Phase 4 Complete When:
- ✅ Support ≥ 5 inverter brands with documented registers
- ✅ Home Assistant integration (MQTT autodiscovery works)
- ✅ Mobile app available on Google Play (beta track)
- ✅ Cloud bridge syncs energy history without data loss
- ✅ Community contributions (GitHub issues/PRs) active

---

## 14. Timeline Summary

| Phase | Duration | Staffing | Cost |
|---|---|---|---|
| Phase 1 (ESP32-S3 + Single Inverter) | 6-8 weeks | 1 firmware engineer + 1 mobile developer | Medium |
| Phase 2 (Multi-Inverter + Web Dashboard) | 6-8 weeks | Same + 1 web developer | Medium |
| Phase 3 (Production Hardening) | 4-6 weeks | Same + 1 QA engineer | Low |
| Phase 4 (Ecosystem) | Ongoing | 1-2 part-time community managers | Variable |
| **Total MVP (Phase 1-2)** | **3-4 months** | **3-4 FTE** | **Medium** |

---

## 15. Next Immediate Actions

1. **Acquire ESP32-S3 DevKitC-1 boards** (3× for dev, test, spare)
2. **Set up ESP-IDF v5.2** on all dev machines
3. **Procure RS485 hardware:**
   - 4× MAX485 modules (2 per board for dual-port capability)
   - Shielded twisted pair cable (50m)
   - 120Ω terminators + ferrite chokes
4. **Obtain device datasheets + Modbus registers:**
   - Huawei Sun2000 (inverter) — Modbus register map
   - Carlo Gavazzi WM15 — Already have protocol doc
   - Rozwell EM500 — Already implemented
5. **Spike: Multi-device polling on single port** (Week 1)
   - Test Slave ID 1 (meter) + Slave ID 2 (inverter) on UART0
   - Verify CRC, timeout handling, staggered polling
   - Target: 2/sec update frequency per device
6. **Create device adapter registry**
   - TypeScript profiles: `huawei.ts`, `wm15_gavazzi.ts`, `rozwell_em500.ts`
   - C firmware adapters: `inverter_modbus.c`, `meter_modbus.c`
7. **Set up CI/CD** (GitHub Actions for firmware builds + mobile APK)
8. **Mobile app: Reusable components**
   - Extract Modbus telemetry display into shared component
   - Build device registry UI (dynamic field mapping)
   - Role-based feature flags (owner, installer, support roles)
9. **Create API spec** (v1.0 endpoint contracts + Modbus device config)

---

**Document Version:** 1.0  
**Last Reviewed:** 2026-05-02  
**Next Review:** After Phase 1 spike completion
