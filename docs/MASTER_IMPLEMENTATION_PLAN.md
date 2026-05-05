# Mini PV Controller — Master Implementation Plan

**Version:** 2.1  
**Date:** 2026-05-03  
**Hardware Target:** ESP32-S3 DevKitC-1 (16 MB Flash, 8 MB PSRAM)  
**Status:** Execution-ready — v2.1 includes verified corrections

---

## 0. Verification Findings (v2.1 Corrections)

Cross-checked against firmware source, firmware_core C++ headers, hardware docs, and all planning docs.
Issues are grouped by severity.

### CRITICAL — Code will not work as written

| # | Issue | Location in v2.0 | Fix |
|---|-------|-----------------|-----|
| C1 | **Partition table overflow** — `0x610000 + 0xA00000 = 0x1010000 > 0x1000000` (16 MB limit) | §4.4 partitions.csv | Reduce OTA slots to 0x200000 each; history at 0x410000 |
| C2 | **`control_bridge.cpp` uses wrong C++ API** — `createRuntimeSiteModel()` does not exist; `evaluatePolicy()` takes `(const DzxConfig& cfg, const RealMeterSample& real)`, not a RuntimeSiteModel; `clampPct` is always `0.0` in C++ impl — must use `decision.targetKw` | §5.5 control_bridge.cpp | Rewritten below |
| C3 | **`RealMeterSample` fields missing** — C++ struct requires `source` (string), `sourceKnown` (bool), `importKw`, `exportKw`, `generatorKw`, `sampleTimeMs` fields; bridge only sets `kw` and `stale` | §5.5 control_bridge.cpp | Add all fields; set `source` from gen GPIO state |
| C4 | **Modbus UART mutex missing** — `modbus_poll.c` reads and `control_task.c` writes to UART1 concurrently without any mutex; frames will corrupt | §5.3, §5.5 | Add `SemaphoreHandle_t s_mb_mutex` in modbus_rtu.c |
| C5 | **GPIO conflict across documents** — MINI_PV_CONTROLLER_PLAN.md says UART0=GPIO 1/3/2 (ADC pins!); HARDWARE_SETUP.md says UART0=43/44/2 (breaks debug console) vs UART1=17/18/21 (RX=18 not 16); master plan + firmware use UART1 17/**16**/18 | §3 GPIO table | Single canonical pin table below; UART0 must NOT be used for Modbus |
| C6 | **`detectSource()` uses `sample.source` string, not `sample.kw` sign** — C++ source_detection.cpp ignores kw, reads the string field `"GRID"`/`"GENERATOR"`/`"NONE"`. Firmware must set this explicitly from gen GPIO or meter reading | §5.5 control_bridge.cpp | Set `sample.source = gen_running ? "GENERATOR" : "GRID"` |

### IMPORTANT — Will fail at hardware/integration test

| # | Issue | Fix |
|---|-------|-----|
| I1 | **SNTP time sync absent** — energy history `unix_ts` will be 0 on boot until NTP sync; all records timestamped wrong | Add `esp_sntp_init()` in `app_main`; fallback to boot-relative counter if no WiFi |
| I2 | **Ramp rate limiting absent** — without it the control loop oscillates; MODBUS_INTEGRATION_ROADMAP specifies 1 %/10 s ramp-up, 5 %/s ramp-down | Add ramp logic to `control_task.c` (see §5.5 updated) |
| I3 | **`modbus_poll.h` hardcodes `pvdg_huawei_snapshot_t`** — breaks the generic inverter interface planned for Phase 3 | Use `pvdg_inverter_snapshot_t` + driver function pointer from Phase 1 |
| I4 | **`g_poll` struct concurrent access** — http_server and control_task both read; poll_task writes; no protection against partial reads | Add double-buffer or protect with a mutex/semaphore |
| I5 | **`simulator.cpp` included in firmware component** — test-only file adds unused code size to production firmware | Remove from component SRCS list |
| I6 | **FreeRTOS event group not implemented** — plan text says "notify via event group" but no `EventGroupHandle_t` is defined or used | Define `s_poll_ready_event` in modbus_poll.h; wait in control_task |
| I7 | **`sdkconfig.defaults` wrong PSRAM key** — `CONFIG_SPIRAM_SUPPORT=y` is ESP32 (not S3); ESP-IDF v5 uses `CONFIG_SPIRAM=y` | Fix in §4.3 |
| I8 | **Device discovery endpoint missing** — DEVICE_REGISTRY.md requires `POST /device/discover` for mobile commissioning flow; not in firmware task list | Add to Phase 1 REST API tasks |
| I9 | **Alarms endpoint missing** — Phase 4 mentions `GET /alarms` but no firmware task plans it | Add `GET /alarms` to http_server.c task list |
| I10 | **String temperatures absent from Huawei adapter** — DEVICE_REGISTRY.md specifies string temps at `0x3200 + N×0x10`; omitted from huawei_sun2000.h snapshot struct | Add string data to §5.2 |
| I11 | **WM15 phase conflict** — CLARIFICATIONS.md puts WM15 in Phase 1 Wk 2–3; master plan deferred it to Phase 3 Week 11 | WM15 promoted to Phase 1 (alongside Huawei) |
| I12 | **Inverex / Fox have no adapter plan** — both mentioned in MODBUS_INTEGRATION_ROADMAP but absent from Phase 3 priority list | Mark as Phase 3 tail; blocked until manuals obtained |
| I13 | **Chint CPS limit uses absolute Watts**, not % — `write_limit(pct)` interface won't work | Add `max_rated_w` field to `pvdg_inverter_driver_t`; convert pct→W in Chint driver |
| I14 | **Modbus inter-frame gap absent** — RS485 RTU requires 3.5 char × 1 ms/char ≈ 4 ms silent gap between frames; back-to-back polls may collide | Add `vTaskDelay(pdMS_TO_TICKS(5))` between each slave poll in orchestrator |
| I15 | **Config hot-reload absent** — `control_task` loads `site_json` once at startup; `PUT /site/config` changes are ignored until reboot | Store config version counter in NVS; reload in control loop when version changes |

### NICE-TO-HAVE

| # | Issue |
|---|-------|
| N1 | `cJSON` REQUIRES name may differ (IDF v5 uses `json`); verify against working esp32 build |
| N2 | Energy history query response JSON schema not specified; mobile app has no contract to parse it |
| N3 | Commissioning user flow (pair → WiFi → site config → device discover → verify) not documented end-to-end |
| N4 | `double` throughout firmware; `float` is faster on Xtensa LX7 FPU and saves 4 bytes/variable |
| N5 | KPM37 smart meter (mentioned in MODBUS_INTEGRATION_ROADMAP) has no adapter planned |

---

---

## 1. Ground Truth: What Exists Today

### Firmware (firmware/esp32/main/) — REAL, WORKING

| File | Lines | Status |
|------|-------|--------|
| modbus_rtu.c | 84 | ✅ FC03/FC04 read only — **FC06 write MISSING** |
| em500.c | 95 | ✅ Full 3-phase Rozwell/EM500 decode |
| http_server.c | 400 | ✅ REST API — 10 endpoints, token auth |
| wifi.c | 137 | ✅ STA/AP mode, NVS credential storage |
| nvs_store.c | 119 | ✅ WiFi creds, site JSON, pairing token |
| ota.c | 62 | ✅ OTA firmware update |
| device_id.c | 26 | ✅ MAC, IP, firmware version |
| main.c | 18 | ✅ Boot sequence |

**Target: `firmware/esp32-s3/` does NOT exist yet.** All new work goes there.

### firmware_core C++ Library (dynamic_zero_export/firmware_core/) — REAL, TESTED

A standalone C++17 library with its own CMakeLists.txt. Contains the complete control logic — **this gets included as an ESP-IDF component.**

| Source File | Purpose |
|-------------|---------|
| config.cpp | Site config parsing + defaults |
| topology.cpp | Single/dual-bus site topology |
| source_detection.cpp | Grid vs. generator detection |
| virtual_meter.cpp | Virtual meter computation |
| policy_engine.cpp | Zero export / gen min-load decisions → `clampPct` (0–100%) |
| controller.cpp | Main control loop orchestration |
| alarm.cpp | Alarm state management |
| monitoring.cpp | Monitoring snapshots |
| serialization.cpp | JSON encode/decode |
| api_contract.cpp | Live status API response builder |
| simulator.cpp | Test/dev simulator |

**Policy modes already implemented:** `zero_export`, `limited_export`, `generator_min_load`, `reverse_protection`, `safe_fallback`, `pass_through`

### Gateway Register Maps (gateway/src/builtinDriversData/) — REAL

Pre-validated Modbus register maps for 14 device types. Used as source-of-truth when writing C adapters.

| File | Device | Lines |
|------|--------|-------|
| huaweiInverterRegisters.ts | Huawei SUN2000 | 12 |
| huaweiSmartloggerRegisters.ts | Huawei SmartLogger | 77 |
| gcMultilineRegisters.ts | GoodWe (multi-line) | 1019 |
| growattRegisters.ts | Growatt | 152 |
| solisRegisters.ts | Solis | 158 |
| solaxRegisters.ts | Solax | 234 |
| knoxAswRegisters.ts | Knox ASW | 365 |
| cpsChintRegisters.ts | Chint CPS | 262 |
| sungrowRegisters.ts | Sungrow | 83 |
| wm15Registers.ts | Carlo Gavazzi WM15 | 308 |
| iskraMc3Registers.ts | Iskra MC3 | 105 |
| m4mRegisters.ts | M4M meter | 283 |
| sofarCnRegisters.ts | Sofar CN | 156 |

### Mobile App (mobile/src/) — FUNCTIONAL SKELETON

7 screens exist with Redux store and API clients. Dashboard shows mock data until real inverter data arrives from firmware.

### What Is Missing (Blockers)

1. `firmware/esp32-s3/` — the target directory
2. FC06 write-single-register in modbus_rtu.c
3. Any inverter adapter (Huawei, Growatt, etc.)
4. Multi-device polling orchestrator
5. Zero-export control loop wired into firmware
6. MQTT client
7. WebSocket server
8. Energy history ring buffer
9. Generator GPIO signal handler

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    ESP32-S3 Firmware                          │
│                                                               │
│  app_main()                                                   │
│    ├─ nvs_init → load site_config JSON                        │
│    ├─ modbus_init (UART1, GPIO 17/16/18, 9600 bps)            │
│    ├─ wifi_init → STA (site WiFi) or AP (setup mode)          │
│    ├─ http_server_start (REST + WebSocket)                     │
│    ├─ mqtt_client_start (publish telemetry)                   │
│    └─ xTaskCreate: control_task (500 ms cycle)                │
│                                                               │
│  control_task (FreeRTOS, priority 8):                         │
│    loop:                                                      │
│      1. poll_device(slave_id=grid_meter) → em500_snapshot     │
│      2. poll_device(slave_id=inverter)   → inverter_snapshot  │
│      3. firmware_core::evaluatePolicy()  → clampPct           │
│      4. inverter_write_limit(clampPct)   → FC06               │
│      5. publish_telemetry() → MQTT + WebSocket                │
│      6. energy_storage_record()                               │
│      wait 500ms                                               │
│                                                               │
│  Modbus Bus (RS485, single UART):                             │
│    Slave ID 1: Grid Meter (EM500 / WM15)                      │
│    Slave ID 2: Inverter (Huawei / Growatt / Solis / …)        │
│    Slave ID 3: Sub-meter (gen feeder) — Phase 3               │
└──────────────────────────────────────────────────────────────┘
         │ REST  │ WebSocket  │ MQTT
         ▼       ▼            ▼
    Expo Mobile App      MQTT Broker
    (dashboard, config,  (Home Assistant,
     history, alarms)     cloud bridge)
```

---

## 3. ESP32-S3 GPIO Pin Allocation — Canonical Table

**This is the single authoritative pin assignment.** Supersedes conflicting tables in MINI_PV_CONTROLLER_PLAN.md and HARDWARE_SETUP.md.

| Signal | GPIO | UART | Notes |
|--------|------|------|-------|
| RS485 TX | 17 | UART1 | To MAX485 DI |
| RS485 RX | 16 | UART1 | From MAX485 RO |
| RS485 DE/RE | 18 | UART1 RTS | MAX485 half-duplex control |
| RS485-B TX (optional) | 19 | UART2 | Second Modbus bus (Phase 3+) |
| RS485-B RX | 20 | UART2 | — |
| RS485-B DE/RE | 11 | UART2 RTS | — |
| Generator running | 5 | GPIO IN | Optocoupler from gen AUX contact (Phase 3) |
| Status LED | 48 | GPIO OUT | Built-in RGB LED on DevKitC-1 |
| Debug TX | 43 | UART0 | USB-CDC serial monitor — **DO NOT use for Modbus** |
| Debug RX | 44 | UART0 | USB-CDC serial monitor — **DO NOT use for Modbus** |

**Key rule:** UART0 (GPIO 43/44) is the debug console (USB-Serial bridge). Using it for Modbus breaks `idf.py monitor`. Previous documents (HARDWARE_SETUP.md, MINI_PV_CONTROLLER_PLAN.md) were wrong to assign it to Modbus. Firmware uses UART1 (17/16/18) which matches existing `app_config.h` exactly — no GPIO changes needed.

**HARDWARE_SETUP.md errors to ignore:**
- Ignore UART0 = 43/44/2 for grid meter (breaks debug console)
- Ignore UART1 RX = GPIO 18 (it's the DE/RE pin; actual RX = GPIO 16 per firmware)
- MINI_PV_CONTROLLER_PLAN.md UART0 = GPIO 1/3 is also wrong (these are ADC pins)

---

## 4. Phase 0: ESP32-S3 Project Setup

**Duration:** Day 1–2  
**Goal:** Build and flash the existing codebase on ESP32-S3 hardware.

### 4.1 Create firmware/esp32-s3/ Directory

Copy the existing firmware as a starting point:

```
firmware/
├── esp32/          ← keep (archive)
└── esp32-s3/       ← new working directory
    ├── CMakeLists.txt
    ├── sdkconfig.defaults
    └── main/
        ├── CMakeLists.txt
        ├── app_config.h
        ├── main.c
        ├── wifi.c / .h
        ├── nvs_store.c / .h
        ├── device_id.c / .h
        ├── ota.c / .h
        ├── http_server.c / .h
        ├── modbus_rtu.c / .h
        └── em500.c / .h
```

### 4.2 firmware/esp32-s3/CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.16)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(pvdg_esp32s3)
```

### 4.3 firmware/esp32-s3/sdkconfig.defaults

```
CONFIG_IDF_TARGET="esp32s3"
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_PARTITION_TABLE_CUSTOM=y
CONFIG_PARTITION_TABLE_CUSTOM_FILENAME="partitions.csv"
CONFIG_ESP_MAIN_TASK_STACK_SIZE=8192
CONFIG_FREERTOS_HZ=1000
CONFIG_SPIRAM=y
CONFIG_SPIRAM_USE_CAPS_ALLOC=y
CONFIG_MQTT_BUFFER_SIZE=4096
CONFIG_HTTPD_WS_SUPPORT=y
CONFIG_MQTT_TRANSPORT_TCP=y
CONFIG_LWIP_SNTP_MAX_SERVERS=2
```

> **Correction C7:** `CONFIG_SPIRAM_SUPPORT=y` was the ESP32 (non-S3) key. ESP-IDF v5 for ESP32-S3 uses `CONFIG_SPIRAM=y`.

### 4.4 firmware/esp32-s3/partitions.csv

```
# Name,   Type, SubType, Offset,   Size,   Flags
nvs,      data, nvs,     0x9000,   0x6000,
otadata,  data, ota,     0xf000,   0x2000,
ota_0,    app,  ota_0,   0x10000,  0x200000,
ota_1,    app,  ota_1,   0x210000, 0x200000,
history,  data, spiffs,  0x410000, 0xBF0000,
```

> **Correction C1:** v2.0 had `ota_0+ota_1 = 2×0x300000` which placed history ending at `0x1010000`, overflowing 16 MB. Reduced OTA slots to 2 MB each (sufficient for ESP32-S3 app ≤1.5 MB). History partition grows to ~12 MB → **~508,000 records = 352 days at 1 record/min.**
>
> Verify: `0x410000 + 0xBF0000 = 0x1000000` ✓ exactly 16 MB.

### 4.5 firmware/esp32-s3/main/CMakeLists.txt (initial)

```cmake
idf_component_register(
  SRCS
    "main.c"
    "wifi.c"
    "http_server.c"
    "nvs_store.c"
    "device_id.c"
    "ota.c"
    "modbus_rtu.c"
    "em500.c"
  INCLUDE_DIRS "."
  REQUIRES
    esp_http_server
    esp_wifi
    nvs_flash
    esp_ota_ops
    driver
    cJSON
    spiffs
)
```

### 4.6 app_config.h Updates for ESP32-S3

```c
// Add to existing app_config.h:
#define PVDG_HW_TARGET        "esp32-s3"
#define PVDG_FW_VERSION       "0.2.0"

// GPIO 48 = built-in RGB LED on DevKitC-1
#define PVDG_STATUS_LED_GPIO  48

// Generator running signal (Phase 3)
#define PVDG_GEN_RUN_GPIO     5
```

### 4.7 Verification

```bash
cd firmware/esp32-s3
idf.py set-target esp32s3
idf.py build            # must compile clean
idf.py flash monitor    # boot messages on serial
```

**Success criteria:** Serial shows `PV-DG custom firmware boot`, WiFi AP starts, `/whoami` responds via HTTP.

---

## 5. Phase 1: Modbus Write + Inverter Control

**Duration:** Weeks 1–4  
**Goal:** Working zero-export loop — EM500 read → policy decision → Huawei power limit write.

### 5.1 Add FC06 Write to modbus_rtu.c

**File:** `firmware/esp32-s3/main/modbus_rtu.c`  
**File:** `firmware/esp32-s3/main/modbus_rtu.h`

Add to `modbus_rtu.h`:

```c
// Write single holding register (FC06)
esp_err_t pvdg_modbus_write_single_reg(uint8_t slave_id, uint16_t addr, uint16_t value);

// Write multiple holding registers (FC16)
esp_err_t pvdg_modbus_write_multiple_regs(uint8_t slave_id, uint16_t addr,
                                           uint16_t count, const uint16_t *values);
```

Implementation for `modbus_rtu.c` — append after existing `read_regs_common()`:

```c
esp_err_t pvdg_modbus_write_single_reg(uint8_t slave_id, uint16_t addr, uint16_t value) {
    uint8_t req[8];
    req[0] = slave_id;
    req[1] = 0x06;  // FC06
    req[2] = (uint8_t)(addr >> 8);
    req[3] = (uint8_t)(addr & 0xFF);
    req[4] = (uint8_t)(value >> 8);
    req[5] = (uint8_t)(value & 0xFF);
    uint16_t crc = crc16_modbus(req, 6);
    req[6] = (uint8_t)(crc & 0xFF);
    req[7] = (uint8_t)(crc >> 8);

    uart_flush_input(PVDG_MB_UART);
    if (uart_write_bytes(PVDG_MB_UART, (const char *)req, 8) != 8) return ESP_FAIL;

    // Response: echo of request (8 bytes)
    uint8_t resp[8];
    int r = uart_read_bytes(PVDG_MB_UART, resp, 8, pdMS_TO_TICKS(450));
    if (r < 8) return ESP_ERR_TIMEOUT;
    if (resp[0] != slave_id || resp[1] != 0x06) return ESP_FAIL;
    uint16_t got_crc  = (uint16_t)resp[6] | ((uint16_t)resp[7] << 8);
    uint16_t calc_crc = crc16_modbus(resp, 6);
    if (got_crc != calc_crc) return ESP_ERR_INVALID_CRC;
    return ESP_OK;
}

esp_err_t pvdg_modbus_write_multiple_regs(uint8_t slave_id, uint16_t addr,
                                            uint16_t count, const uint16_t *values) {
    if (!values || count == 0 || count > 64) return ESP_ERR_INVALID_ARG;
    // Request: [slave][0x10][addr_hi][addr_lo][count_hi][count_lo][byte_count][data...][crc_lo][crc_hi]
    uint8_t req[9 + 128];
    req[0] = slave_id;
    req[1] = 0x10;
    req[2] = (uint8_t)(addr >> 8);
    req[3] = (uint8_t)(addr & 0xFF);
    req[4] = (uint8_t)(count >> 8);
    req[5] = (uint8_t)(count & 0xFF);
    req[6] = (uint8_t)(count * 2);
    for (uint16_t i = 0; i < count; i++) {
        req[7 + i * 2]     = (uint8_t)(values[i] >> 8);
        req[7 + i * 2 + 1] = (uint8_t)(values[i] & 0xFF);
    }
    size_t pdu_len = 7 + count * 2;
    uint16_t crc = crc16_modbus(req, pdu_len);
    req[pdu_len]     = (uint8_t)(crc & 0xFF);
    req[pdu_len + 1] = (uint8_t)(crc >> 8);

    uart_flush_input(PVDG_MB_UART);
    int total = (int)(pdu_len + 2);
    if (uart_write_bytes(PVDG_MB_UART, (const char *)req, total) != total) return ESP_FAIL;

    // Response: 8-byte echo [slave][0x10][addr_hi][addr_lo][count_hi][count_lo][crc_lo][crc_hi]
    uint8_t resp[8];
    int r = uart_read_bytes(PVDG_MB_UART, resp, 8, pdMS_TO_TICKS(450));
    if (r < 8) return ESP_ERR_TIMEOUT;
    if (resp[0] != slave_id || resp[1] != 0x10) return ESP_FAIL;
    uint16_t got_crc  = (uint16_t)resp[6] | ((uint16_t)resp[7] << 8);
    uint16_t calc_crc = crc16_modbus(resp, 6);
    if (got_crc != calc_crc) return ESP_ERR_INVALID_CRC;
    return ESP_OK;
}
```

---

### 5.2 Huawei SUN2000 Adapter

**Files to create:**
- `firmware/esp32-s3/main/inverters/huawei_sun2000.h`
- `firmware/esp32-s3/main/inverters/huawei_sun2000.c`

**huawei_sun2000.h:**

```c
#pragma once
#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

typedef struct {
    bool ok;
    // AC side
    double ac_voltage_l1_v;
    double ac_voltage_l2_v;
    double ac_voltage_l3_v;
    double ac_current_l1_a;
    double ac_current_l2_a;
    double ac_current_l3_a;
    double ac_active_power_w;     // Signed: positive = generation
    double ac_reactive_power_var;
    double ac_power_factor;
    double ac_frequency_hz;
    double efficiency_pct;
    // DC side
    double dc_voltage_v;
    double dc_current_a;
    double dc_power_w;
    // Energy
    double daily_energy_kwh;
    double lifetime_energy_kwh;
    // Status
    uint16_t state_code;          // 0=standby, 1=grid-on, 2=fault, 3=upgrading
    uint16_t alarm_code;
    // Active power limit (read-back)
    double active_power_limit_pct; // 0–100
    // PV string data (fix I10) — up to 8 strings for typical residential units
    struct {
        double voltage_v;
        double current_a;
        double temperature_c;   // from combiner box sensor via Modbus
        bool   ok;              // false if register read failed
    } strings[8];
    int string_count;           // number of strings configured (0 if not read)
} pvdg_huawei_snapshot_t;

// Read all monitoring registers in one call
esp_err_t pvdg_huawei_read(uint8_t slave_id, pvdg_huawei_snapshot_t *out);

// Write active power limit — primary control command
// pct: 0.0–100.0  (100 = full production, 0 = shut down output)
esp_err_t pvdg_huawei_write_active_power_limit(uint8_t slave_id, double pct);
```

**huawei_sun2000.c key register addresses** (from DEVICE_REGISTRY.md + gateway data):

| Parameter | Register | FC | Scale | Notes |
|-----------|----------|----|-------|-------|
| AC Voltage L1 | 0x0202 | 04 | 0.1 V | |
| AC Current L1 | 0x0205 | 04 | 0.01 A | |
| AC Active Power | 0x0209 | 04 | 1 W | Signed S32 (2 regs) |
| AC Frequency | 0x0208 | 04 | 0.01 Hz | |
| Efficiency | 0x020D | 04 | 0.01 % | |
| DC Voltage | 0x020E | 04 | 0.1 V | |
| DC Current | 0x020F | 04 | 0.01 A | |
| Daily Energy | 0x0262 | 04 | 0.01 kWh | |
| State Code | 0x0089 | 03 | — | Holding reg |
| Alarm Code | 0x008C | 03 | — | Holding reg |
| **Active Power Limit** | **0x4640** | **06** | **1 %** | **Write 0–100** |

**Implementation pattern:**

```c
esp_err_t pvdg_huawei_write_active_power_limit(uint8_t slave_id, double pct) {
    if (pct < 0.0) pct = 0.0;
    if (pct > 100.0) pct = 100.0;
    uint16_t val = (uint16_t)(pct + 0.5);  // round to nearest %
    esp_err_t ret = pvdg_modbus_write_single_reg(slave_id, 0x4640, val);
    if (ret != ESP_OK) {
        ESP_LOGW("huawei", "write_limit slave=%d pct=%.1f err=0x%x", slave_id, pct, ret);
    }
    return ret;
}
```

---

### 5.3 Multi-Device Polling

**Files to create:**
- `firmware/esp32-s3/main/modbus_poll.h`
- `firmware/esp32-s3/main/modbus_poll.c`

This replaces ad-hoc polling with a slot-based orchestrator:

```c
// modbus_poll.h
#pragma once
#include "em500.h"
#include "inverters/huawei_sun2000.h"

typedef struct {
    pvdg_em500_grid_t   meter;    // updated every cycle
    pvdg_huawei_snapshot_t inverter; // updated every cycle
    bool meter_online;
    bool inverter_online;
    uint32_t cycle_count;
    uint32_t meter_errors;
    uint32_t inverter_errors;
} pvdg_poll_state_t;

extern pvdg_poll_state_t g_poll;  // global, read by http_server + control_task

void pvdg_poll_init(uint8_t meter_slave_id, uint8_t inverter_slave_id);
// FreeRTOS task — call via xTaskCreate
void pvdg_poll_task(void *arg);
```

**modbus_poll.h — corrected for multi-brand (fix I3, I4, I6):**

```c
#pragma once
#include "em500.h"
#include "inverters/inverter_iface.h"   // generic — NOT huawei-specific
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"

#define PVDG_POLL_DATA_READY_BIT  BIT0

typedef struct {
    pvdg_em500_grid_t   meter;           // protected by s_poll_mutex
    pvdg_inverter_snapshot_t inverter;   // generic interface type
    bool meter_online;
    bool inverter_online;
    uint32_t cycle_count;
    uint32_t meter_errors;
    uint32_t inverter_errors;
} pvdg_poll_state_t;

extern pvdg_poll_state_t g_poll;
extern EventGroupHandle_t g_poll_events;  // set PVDG_POLL_DATA_READY_BIT each cycle

void pvdg_poll_init(uint8_t meter_slave_id, uint8_t inverter_slave_id,
                    const pvdg_inverter_driver_t *inv_driver);
void pvdg_poll_task(void *arg);
```

**modbus_rtu.c — add mutex (fix C4):**

```c
// Add at top of modbus_rtu.c:
#include "freertos/semphr.h"
static SemaphoreHandle_t s_mb_mutex = NULL;

// In pvdg_modbus_init():
s_mb_mutex = xSemaphoreCreateMutex();

// Wrap every uart_write_bytes/uart_read_bytes block:
// xSemaphoreTake(s_mb_mutex, pdMS_TO_TICKS(600));
// ... uart ops ...
// xSemaphoreGive(s_mb_mutex);

// Expose for control_task to hold during write:
esp_err_t pvdg_modbus_take(uint32_t timeout_ms);   // xSemaphoreTake wrapper
void      pvdg_modbus_give(void);                   // xSemaphoreGive wrapper
```

**Polling cycle (500 ms):**

```
T+0 ms:    take modbus mutex
           Read EM500 meter    (FC04, ~60 ms RTT)
           give modbus mutex
T+5 ms:    inter-frame gap (vTaskDelay 5 ms)   ← fix I14
T+65 ms:   take modbus mutex
           Read Huawei inverter (FC04, ~80 ms RTT)
           give modbus mutex
T+150 ms:  Copy to g_poll under poll mutex
           xEventGroupSetBits(g_poll_events, PVDG_POLL_DATA_READY_BIT)  ← fix I6
T+500 ms:  Next cycle
```

**Slave IDs** come from NVS site config JSON (parsed on boot). Defaults: meter=1, inverter=2.

**g_poll concurrent access protection (fix I4):**

`g_poll` is written by `pvdg_poll_task` and read by `control_task` and `http_server`. Without protection, `http_server` may see a partially-written snapshot.

```c
// modbus_poll.h — add:
extern SemaphoreHandle_t g_poll_mutex;  // take before read/write of g_poll

// modbus_poll.c — in pvdg_poll_init():
g_poll_mutex = xSemaphoreCreateMutex();

// poll_task — after building complete snapshot locally:
if (xSemaphoreTake(g_poll_mutex, pdMS_TO_TICKS(10)) == pdTRUE) {
    g_poll = local_snapshot;   // atomic struct copy under mutex
    xSemaphoreGive(g_poll_mutex);
}

// control_task + http_server — before reading g_poll:
if (xSemaphoreTake(g_poll_mutex, pdMS_TO_TICKS(20)) == pdTRUE) {
    // read g_poll fields
    xSemaphoreGive(g_poll_mutex);
}
```

> Pattern: build the snapshot into a local variable during polling (no lock needed), then copy atomically into `g_poll` under mutex. This keeps the critical section short — just a struct copy, not the full 60 ms Modbus round-trip.

---

### 5.4 firmware_core Integration as ESP-IDF Component

The C++17 firmware_core library at `dynamic_zero_export/firmware_core/` integrates directly as an ESP-IDF component. ESP-IDF v5.x fully supports C++17.

**Step 1:** Symlink or copy the library:

```
firmware/esp32-s3/components/dzx_core/
    ├── CMakeLists.txt          ← new ESP-IDF component wrapper
    ├── include/                ← symlink → dynamic_zero_export/firmware_core/include/
    └── src/                    ← symlink → dynamic_zero_export/firmware_core/src/
```

**Step 2:** `firmware/esp32-s3/components/dzx_core/CMakeLists.txt`:

```cmake
idf_component_register(
  SRCS
    "src/config.cpp"
    "src/topology.cpp"
    "src/source_detection.cpp"
    "src/virtual_meter.cpp"
    "src/alarm.cpp"
    "src/monitoring.cpp"
    "src/serialization.cpp"
    "src/api_contract.cpp"
    "src/controller.cpp"
    "src/policy_engine.cpp"
    # simulator.cpp intentionally excluded — test-only (fix I5)
  INCLUDE_DIRS "include"
)
```

**Step 3:** Add to main CMakeLists.txt:

```cmake
REQUIRES dzx_core
```

---

### 5.5 Zero-Export Control Task

**Files to create:**
- `firmware/esp32-s3/main/control_task.h`
- `firmware/esp32-s3/main/control_task.c` (C file with C++ extern calls)

```c
// control_task.h
#pragma once
void pvdg_control_task_start(void);  // call from app_main after poll_task starts
```

```c
// control_task.c
#include "control_task.h"
#include "modbus_poll.h"
#include "inverters/huawei_sun2000.h"
#include "nvs_store.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

// C linkage bridge to firmware_core C++ (see control_bridge.cpp)
extern double dzx_evaluate_policy(double grid_kw, bool stale, const char *site_json);

static const char *TAG = "ctrl";
static uint8_t s_inverter_slave = 2;

static void control_task(void *arg) {
    char *site_json = NULL;
    (void)pvdg_nvs_load_site_json(&site_json);  // may be NULL before commissioning

    for (;;) {
        // Wait for fresh poll data (max 600 ms)
        vTaskDelay(pdMS_TO_TICKS(500));

        if (!g_poll.meter_online) {
            // Safe fallback: meter offline → allow full production (fail-open)
            ESP_LOGW(TAG, "meter offline — skipping control");
            continue;
        }

        double grid_kw = g_poll.meter.total_active_power_w / 1000.0;
        bool stale = (g_poll.meter_errors > 3);

        double clamp_pct = dzx_evaluate_policy(grid_kw, stale, site_json);

        esp_err_t ret = pvdg_huawei_write_active_power_limit(s_inverter_slave, clamp_pct);
        if (ret == ESP_OK) {
            ESP_LOGI(TAG, "grid=%.2f kW → limit=%.1f%%", grid_kw, clamp_pct);
        }
    }
}

void pvdg_control_task_start(void) {
    xTaskCreate(control_task, "ctrl", 8192, NULL, 8, NULL);
}
```

**Files to create:**
- `firmware/esp32-s3/main/control_bridge.cpp` — C++ wrapper that calls firmware_core

> **Corrections C2, C3, C6 applied below.** The v2.0 code had three fatal bugs:
> 1. `createRuntimeSiteModel()` does not exist in C++ API — `evaluatePolicy` takes `DynamicZeroExportSiteConfig` directly
> 2. `clampPct` is always `0.0` in C++ impl — must use `decision.targetKw` and convert
> 3. `detectSource()` reads `sample.source` string, not `sample.kw` sign — must set `sample.source` explicitly

```cpp
// control_bridge.cpp — C++ translation unit for firmware_core calls
#include "dzx/policy_engine.hpp"
#include "dzx/config.hpp"
#include "dzx/serialization.hpp"
#include "esp_log.h"
#include <cmath>

static const char *TAG = "dzx_bridge";

// Config version tracking for hot-reload (fix I15)
static dzx::DynamicZeroExportSiteConfig s_cfg;
static bool   s_cfg_ready = false;
static uint32_t s_cfg_version = 0;

extern "C" void dzx_load_config(const char *site_json, uint32_t version) {
    if (!site_json) return;
    auto parsed = dzx::parseConfig(std::string(site_json));
    if (parsed.has_value()) {
        s_cfg = *parsed;
        s_cfg_ready = true;
        s_cfg_version = version;
        ESP_LOGI(TAG, "site config loaded v%lu", (unsigned long)version);
    } else {
        ESP_LOGW(TAG, "site config parse failed — using defaults");
        s_cfg = dzx::defaultConfig();
        s_cfg_ready = true;
    }
}

// Returns: targetKw = how much to reduce inverter output (0 = no reduction = full production)
// Caller converts to clamp% using: new_limit_pct = clamp(0,100, (inv_kw - targetKw)/inv_max_kw * 100)
//
// gen_running: set from GPIO PVDG_GEN_RUN_GPIO (or false when gen GPIO not yet implemented)
// export_kw:   EM500 total_active_power_w / 1000.0
//              Sign convention: positive = net export to grid, negative = net import from grid
//
extern "C" double dzx_evaluate_policy(double export_kw, bool stale,
                                       bool gen_running, uint64_t now_ms) {
    if (!s_cfg_ready) {
        s_cfg = dzx::defaultConfig();
        s_cfg_ready = true;
    }

    dzx::RealMeterSample sample;
    sample.kw          = export_kw;
    sample.exportKw    = export_kw > 0.0 ? export_kw : 0.0;
    sample.importKw    = export_kw < 0.0 ? -export_kw : 0.0;
    sample.generatorKw = gen_running ? std::fabs(export_kw) : 0.0;
    sample.stale       = stale;
    sample.sourceKnown = true;
    sample.sampleTimeMs = now_ms;
    // source string drives detectSource() — kw sign is NOT used in C++ impl
    sample.source = gen_running ? "GENERATOR" : "GRID";

    auto eval = dzx::evaluatePolicy(s_cfg, sample);
    return eval.decision.targetKw;   // kW to reduce; 0 = allow full production
}
```

**control_task.c — updated to use corrected bridge + ramp limiting (fixes C2, I2, I15):**

```c
// control_task.c
#include "control_task.h"
#include "modbus_poll.h"
#include "inverters/inverter_iface.h"
#include "nvs_store.h"
#include "app_config.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"

extern void   dzx_load_config(const char *json, uint32_t version);
extern double dzx_evaluate_policy(double export_kw, bool stale,
                                   bool gen_running, uint64_t now_ms);

static const char *TAG     = "ctrl";
static uint8_t  s_inv_slave = 2;
static double   s_last_pct  = 100.0;  // start at full production
static uint32_t s_cfg_ver   = 0;

// Ramp limits (fix I2) — matches MODBUS_INTEGRATION_ROADMAP spec
#define RAMP_UP_PCT_PER_CYCLE    2.0   // 1 cycle = 500 ms → 2%/500ms = 4%/s ramp-up
#define RAMP_DOWN_PCT_PER_CYCLE 20.0   // fast curtailment when exporting

static double apply_ramp(double desired, double current) {
    double delta = desired - current;
    if (delta > 0) delta = fmin(delta, RAMP_UP_PCT_PER_CYCLE);
    else           delta = fmax(delta, -RAMP_DOWN_PCT_PER_CYCLE);
    return current + delta;
}

static bool gen_is_running(void) {
#ifdef PVDG_GEN_RUN_GPIO
    return gpio_get_level(PVDG_GEN_RUN_GPIO) == 1;
#else
    return false;
#endif
}

static void control_task(void *arg) {
    // Load initial config
    char *site_json = NULL;
    pvdg_nvs_load_site_json(&site_json);
    dzx_load_config(site_json, 1);
    if (site_json) free(site_json);

    const pvdg_inverter_driver_t *driver =
        pvdg_inverter_find_driver("huawei");  // resolved from site config in production

    for (;;) {
        // Wait for fresh poll data (max 700 ms)
        xEventGroupWaitBits(g_poll_events, PVDG_POLL_DATA_READY_BIT,
                            pdTRUE, pdFALSE, pdMS_TO_TICKS(700));

        // Hot-reload config if NVS version changed (fix I15)
        uint32_t nv_ver = pvdg_nvs_get_config_version();
        if (nv_ver != s_cfg_ver) {
            pvdg_nvs_load_site_json(&site_json);
            dzx_load_config(site_json, nv_ver);
            if (site_json) free(site_json);
            s_cfg_ver = nv_ver;
        }

        if (!g_poll.meter_online) {
            ESP_LOGW(TAG, "meter offline — no control");
            continue;
        }

        // EM500 sign: positive = import, negative = export
        // firmware_core expects: positive = export, negative = import → negate
        double export_kw = -(g_poll.meter.total_active_power_w / 1000.0);
        bool stale  = (g_poll.meter_errors > 3);
        uint64_t now = (uint64_t)(esp_timer_get_time() / 1000);

        double target_kw = dzx_evaluate_policy(export_kw, stale, gen_is_running(), now);

        // Convert targetKw reduction to clamp%
        double inv_kw     = g_poll.inverter.ac_active_power_w / 1000.0;
        double inv_max_kw = 10.0;   // TODO: read from site config
        double desired_pct = 100.0;
        if (target_kw > 0.0 && inv_max_kw > 0.0) {
            double new_kw  = fmax(0.0, inv_kw - target_kw);
            desired_pct    = fmin(100.0, (new_kw / inv_max_kw) * 100.0);
        }

        double ramped_pct = apply_ramp(desired_pct, s_last_pct);
        s_last_pct = ramped_pct;

        if (driver && g_poll.inverter_online) {
            esp_err_t ret = driver->write_limit(s_inv_slave, ramped_pct);
            ESP_LOGI(TAG, "exp=%.2f kW target=%.2f kW → limit=%.1f%%  %s",
                     export_kw, target_kw, ramped_pct,
                     ret == ESP_OK ? "OK" : "FAIL");
        }
    }
}

void pvdg_control_task_start(void) {
    xTaskCreate(control_task, "ctrl", 8192, NULL, 8, NULL);
}
```

> **EM500 sign note:** EM500 `total_active_power_w` is positive when importing from grid, negative when exporting. firmware_core expects positive = exporting. The bridge negates: `export_kw = -(meter.total_active_power_w / 1000.0)`. **Validate this with a bench test on Day 1.**

Add `control_bridge.cpp` to `main/CMakeLists.txt` SRCS list.

---

### 5.6 app_main.c Updates

```c
// main.c (updated — adds SPIFFS, SNTP, event group, gen GPIO)
#include "app_config.h"
#include "device_id.h"
#include "esp_log.h"
#include "esp_vfs_spiffs.h"
#include "esp_sntp.h"
#include "driver/gpio.h"
#include "nvs_store.h"
#include "ota.h"
#include "modbus_rtu.h"
#include "modbus_poll.h"
#include "control_task.h"
#include "energy_history.h"
#include "wifi.h"
#include "http_server.h"

static const char *TAG = "pvdg_main";

static void sntp_init_once(void) {                      // fix I1
    esp_sntp_setoperatingmode(SNTP_OPMODE_POLL);
    esp_sntp_setservername(0, "pool.ntp.org");
    esp_sntp_setservername(1, "time.google.com");
    esp_sntp_init();
}

static void spiffs_init(void) {
    esp_vfs_spiffs_conf_t cfg = {
        .base_path = "/history",
        .partition_label = "history",
        .max_files = 4,
        .format_if_mount_failed = true,
    };
    ESP_ERROR_CHECK(esp_vfs_spiffs_register(&cfg));
}

static void gen_gpio_init(void) {                       // fix C6
#ifdef PVDG_GEN_RUN_GPIO
    gpio_config_t io = {
        .pin_bit_mask = (1ULL << PVDG_GEN_RUN_GPIO),
        .mode         = GPIO_MODE_INPUT,
        .pull_up_en   = GPIO_PULLDOWN_ENABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    gpio_config(&io);
#endif
}

void app_main(void) {
    ESP_LOGI(TAG, "Mini PV Controller boot [%s]", PVDG_FW_VERSION);
    ESP_ERROR_CHECK(pvdg_nvs_init());
    pvdg_ota_init();
    spiffs_init();
    gen_gpio_init();
    ESP_ERROR_CHECK(pvdg_modbus_init());

    const pvdg_inverter_driver_t *inv_driver = pvdg_inverter_find_driver("huawei");
    pvdg_poll_init(/*meter_slave=*/1, /*inverter_slave=*/2, inv_driver);
    xTaskCreate(pvdg_poll_task, "poll", 4096, NULL, 7, NULL);
    pvdg_control_task_start();

    ESP_ERROR_CHECK(pvdg_wifi_init());
    ESP_ERROR_CHECK(pvdg_wifi_start_bootstrap());
    sntp_init_once();           // starts after WiFi so it can reach NTP servers
    pvdg_energy_history_init(); // open/create SPIFFS ring buffer
    ESP_ERROR_CHECK(pvdg_http_start());
}
```

### 5.7 REST API Updates (http_server.c)

Replace the hardcoded mock inverter data in `telemetry_snapshot_get()`:

```c
// Inside telemetry_snapshot_get():
// Replace hardcoded values with g_poll data:
cJSON_AddNumberToObject(inv, "ac_power_w",   g_poll.inverter.ac_active_power_w);
cJSON_AddNumberToObject(inv, "dc_power_w",   g_poll.inverter.dc_power_w);
cJSON_AddNumberToObject(inv, "status_code",  g_poll.inverter.state_code);
cJSON_AddBoolToObject(inv,   "online",       g_poll.inverter_online);
cJSON_AddNumberToObject(grid, "total_power_w", g_poll.meter.total_active_power_w);
cJSON_AddBoolToObject(grid,  "online",         g_poll.meter_online);
```

Add new endpoints to `http_server.c` (fixes I8, I9):

**`GET /control/status`**
```json
{
  "policy_mode": "zero_export",
  "target_kw": 0.0,
  "inverter_limit_pct": 67,
  "export_kw": 1.2,
  "gen_running": false,
  "cycle_count": 3421
}
```

**`POST /device/discover`** — scan RS485 for Modbus slaves (fix I8)
```json
// Request:
{ "port": "A", "baud_rate": 9600, "scan_range": [1, 32] }
// Response:
{ "devices": [{ "slave_id": 1, "responding": true }, { "slave_id": 2, "responding": true }] }
```

**`GET /alarms`** — active alarm list (fix I9)
```json
{ "alarms": [{ "code": "STALE_DATA", "severity": "warning", "message": "...", "ts_ms": 1234567 }] }
```

**`GET /energy/history`** — query ring buffer (fix N2)
```
Query params: range=24h|7d|30d  resolution=1m|1h|1d
Response: { "records": [{ "ts": 1234567, "grid_w": -1200, "solar_w": 3500, "load_w": 2300, "clamp_pct": 67 }] }
```

### 5.10 Verified Device Register Maps

> **Rule:** Use these tables for all firmware adapter work. The planning docs (DEVICE_REGISTRY.md, MODBUS_INTEGRATION_ROADMAP.md) contain register errors — they are superseded by this section.

---

#### A. Rozwell EM500 — Lab-Verified (source: `firmware/esp32/main/em500.c`)

All FC04 (Input Registers) except energy counters which are FC03 (Holding Registers).  
All reads are S_DWORD or U_DWORD (2 consecutive 16-bit registers, big-endian).

| Field | Address | FC | Format | Scale | Notes |
|-------|---------|-----|--------|-------|-------|
| L1 Voltage | 0x0002 | 04 | U32 | × 0.01 V | |
| L2 Voltage | 0x0004 | 04 | U32 | × 0.01 V | |
| L3 Voltage | 0x0006 | 04 | U32 | × 0.01 V | |
| L1 Current | 0x0008 | 04 | U32 | × 0.0001 A | |
| L2 Current | 0x000A | 04 | U32 | × 0.0001 A | |
| L3 Current | 0x000C | 04 | U32 | × 0.0001 A | |
| L1 Active Power | 0x0014 | 04 | S32 | × 0.01 W | signed |
| L2 Active Power | 0x0016 | 04 | S32 | × 0.01 W | |
| L3 Active Power | 0x0018 | 04 | S32 | × 0.01 W | |
| L1 Reactive Power | 0x001A | 04 | S32 | × 0.01 var | |
| L2 Reactive Power | 0x001C | 04 | S32 | × 0.01 var | |
| L3 Reactive Power | 0x001E | 04 | S32 | × 0.01 var | |
| L1 Apparent Power | 0x0020 | 04 | U32 | × 0.01 VA | |
| L2 Apparent Power | 0x0022 | 04 | U32 | × 0.01 VA | |
| L3 Apparent Power | 0x0024 | 04 | U32 | × 0.01 VA | |
| L1 Power Factor | 0x0026 | 04 | S32 | × 0.0001 | |
| L2 Power Factor | 0x0028 | 04 | S32 | × 0.0001 | |
| L3 Power Factor | 0x002A | 04 | S32 | × 0.0001 | |
| Frequency | 0x0032 | 04 | U32 | × 0.001 Hz | NOT 0.01 |
| Eqv Voltage | 0x0034 | 04 | U32 | × 0.01 V | avg phase |
| Eqv Current | 0x0038 | 04 | U32 | × 0.0001 A | |
| **Total Active Power** | **0x003A** | **04** | **S32** | **× 0.01 W** | **+import / −export** |
| Total Reactive Power | 0x003C | 04 | S32 | × 0.01 var | |
| Total Apparent Power | 0x003E | 04 | U32 | × 0.01 VA | |
| Total Power Factor | 0x0040 | 04 | S32 | × 0.0001 | |
| Import kWh | 0x1B21 | **03** | U64 (4 regs) | ÷ 4294967296 × 0.01 kWh | FC03! |
| Export kWh | **0x1B25** | **03** | U64 (4 regs) | ÷ 4294967296 × 0.01 kWh | NOT 0x1B23 |
| Import kWh T1 | 0x1B49 | 03 | U64 | same | tariff 1 |
| Export kWh T1 | 0x1B4D | 03 | U64 | same | |
| Import kWh T2 | 0x1B5D | 03 | U64 | same | tariff 2 |
| Export kWh T2 | 0x1B61 | 03 | U64 | same | |

**Sign convention:** positive = importing from grid, negative = exporting.  
**Control bridge negates:** `export_kw = -(total_active_power_w / 1000.0)` so firmware_core sees positive = export.

**Planning doc errors to ignore:**
- DEVICE_REGISTRY.md L1 voltage at 0x003C (0.1V) → **wrong**, actual 0x0002 (0.01V)
- DEVICE_REGISTRY.md L1 current at 0x0048 (0.01A) → **wrong**, actual 0x0008 (0.0001A)
- DEVICE_REGISTRY.md export energy at 0x1B23 → **wrong**, actual 0x1B25
- MODBUS_INTEGRATION_ROADMAP frequency scale 0.01 Hz → **wrong**, actual 0.001 Hz
- MODBUS_INTEGRATION_ROADMAP total power scale 1 W → **wrong**, actual 0.01 W

---

#### B. Carlo Gavazzi WM15 — Gateway-Verified (source: `gateway/src/builtinDriversData/wm15Registers.ts`)

All FC04 (Input Registers). S_DWORD = 2 registers (32-bit signed). S_WORD = 1 register (16-bit signed).

| Field | Address | Format | Scale | Confirmed? |
|-------|---------|--------|-------|------------|
| V L1-N | 0x0000 | S_DWORD | validate on hw | gateway has no scale |
| V L2-N | 0x0002 | S_DWORD | validate | |
| V L3-N | 0x0004 | S_DWORD | validate | |
| V L1-L2 | 0x0006 | S_DWORD | validate | line-line |
| A L1 | 0x000C | S_DWORD | validate | |
| A L2 | 0x000E | S_DWORD | validate | inferred (L1=0x000C, L3=0x0010) |
| A L3 | 0x0010 | S_DWORD | validate | |
| W L1 | 0x0012 | S_DWORD | × 1 W | confirmed |
| W L2 | 0x0014 | S_DWORD | × 1 W | inferred |
| W L3 | 0x0016 | S_DWORD | × 1 W | confirmed |
| **W sys (total)** | **0x0028** | **S_DWORD** | **× 0.1 W** | **confirmed** |
| VA sys | 0x002A | S_DWORD | × 0.1 VA | confirmed |
| var sys | 0x002C | S_DWORD | × 0.1 var | confirmed |
| PF L1 | 0x002E | S_WORD | ÷ 1000 | |
| PF sys | 0x0031 | S_WORD | ÷ 1000 | |
| **Hz** | **0x0033** | **S_WORD** | **× 0.1 Hz** | **confirmed — 1 reg only** |
| kWh import (+) | 0x0034 | S_DWORD | × 0.1 kWh | confirmed |
| kWh export (−) | **0x004E** | S_DWORD | × 0.1 kWh | **NOT 0x004A** |
| THD A L1 | 0x0082 | S_DWORD | × 0.01 % | |
| THD V L1-N | 0x008A | S_DWORD | × 0.01 % | |

**Planning doc errors to ignore:**
- DEVICE_REGISTRY.md A L1 at 0x0003 (scale 0.01) → **wrong**, actual 0x000C
- DEVICE_REGISTRY.md Total Power at 0x000C → **wrong**, actual 0x0028 (scale 0.1)
- Earlier §5.9 draft had current at 0x000D, power L1 at 0x0013 → both **wrong**

---

#### C. Huawei SUN2000 — Register Set Conflict (must validate Day 1)

Two incompatible register sets exist in the planning docs. Both are documented here; validate with physical hardware on Day 1.

**Set A — MODBUS_INTEGRATION_ROADMAP + DEVICE_REGISTRY (likely for 3–20 kW RS485 direct)**

| Field | Address | FC | Scale | Format |
|-------|---------|-----|-------|--------|
| AC Voltage L1 | 0x0202 | 04 | × 0.1 V | U16 |
| AC Voltage L2 | 0x0203 | 04 | × 0.1 V | |
| AC Voltage L3 | 0x0204 | 04 | × 0.1 V | |
| AC Current L1 | 0x0205 | 04 | × 0.01 A | |
| AC Current L2 | 0x0206 | 04 | × 0.01 A | |
| AC Current L3 | 0x0207 | 04 | × 0.01 A | |
| AC Frequency | 0x0208 | 04 | × 0.01 Hz | |
| AC Active Power | 0x0209 | 04 | × 1 W | S16 or S32 — confirm |
| DC Voltage | 0x020E | 04 | × 0.1 V | |
| DC Current | 0x020F | 04 | × 0.01 A | |
| Daily Energy | 0x0262 | 04 | × 0.01 kWh | |
| State Code | 0x0089 | 03 | — | 0=standby, 1=grid, 2=fault |
| Alarm Code | 0x008C | 03 | — | |
| **Active Power Limit** | **0x4640** | **06** | **0–100 (%)** | **write to curtail** |
| String N Voltage | 0x3200 + N×0x10 | 04 | × 0.1 V | |
| String N Current | 0x3201 + N×0x10 | 04 | × 0.01 A | |
| String N Temp | 0x3202 + N×0x10 | 04 | × 0.1 °C | S16 signed |

**Set B — gateway huaweiInverterRegisters.ts (likely for commercial models via SmartLogger)**

| Field | Address (decimal) | FC | Scale | Notes |
|-------|-------------------|----|-------|-------|
| Actual Power | 32080 | 04 | S_DWORD | kW, precision 3 |
| Pmax | 30083 | 04 | U_DWORD | kW |
| Command kW | 40120 | 03/06 | ÷ 10 | write for control |
| Active Gradient | 42017 | 03 | U_DWORD ÷ 1000 | %/s |

**Resolution:**
- **Phase 1 (residential 5–20 kW direct RS485):** Use Set A. Default to register 0x4640 for active power limit.
- **Larger commercial (SmartLogger):** Use Set B. Register 40120 for control.
- **Day 1 validation:** Read register 0x4640 via FC06. If no exception response, Set A is correct.
- Mark `huawei_sun2000.c` with `TODO: validate_register_set_on_hardware`.

---

### 5.8 NVS Store Extensions

**File:** `firmware/esp32-s3/main/nvs_store.h` — add to existing header:

```c
// Config version counter — incremented every time site_json is saved
// control_task polls this to detect hot-reload (fix I15)
uint32_t pvdg_nvs_get_config_version(void);

// MQTT broker configuration (Phase 2)
typedef struct {
    char     host[65];
    uint16_t port;
    char     username[33];
    char     password[65];
} pvdg_mqtt_config_t;

esp_err_t pvdg_nvs_load_mqtt_config(pvdg_mqtt_config_t *out);
esp_err_t pvdg_nvs_save_mqtt_config(const pvdg_mqtt_config_t *cfg);
```

**File:** `firmware/esp32-s3/main/nvs_store.c` — extend `pvdg_nvs_save_site_json()`:

```c
// NVS key for version counter:
#define NVS_KEY_CFG_VER  "cfg_version"

// Modify pvdg_nvs_save_site_json() — add after nvs_set_str(handle, "site_json", json):
uint32_t ver = 0;
nvs_get_u32(handle, NVS_KEY_CFG_VER, &ver);   // ignore error (key may not exist yet)
ver++;
nvs_set_u32(handle, NVS_KEY_CFG_VER, ver);
nvs_commit(handle);

// New function:
uint32_t pvdg_nvs_get_config_version(void) {
    nvs_handle_t h;
    if (nvs_open("pvdg", NVS_READONLY, &h) != ESP_OK) return 0;
    uint32_t ver = 0;
    nvs_get_u32(h, NVS_KEY_CFG_VER, &ver);
    nvs_close(h);
    return ver;
}

// MQTT config — NVS namespace "pvdg_mqtt":
esp_err_t pvdg_nvs_load_mqtt_config(pvdg_mqtt_config_t *out) {
    nvs_handle_t h;
    esp_err_t err = nvs_open("pvdg_mqtt", NVS_READONLY, &h);
    if (err != ESP_OK) return err;
    size_t sz = sizeof(out->host);
    nvs_get_str(h, "host", out->host, &sz);
    nvs_get_u16(h, "port", &out->port);
    sz = sizeof(out->username); nvs_get_str(h, "user", out->username, &sz);
    sz = sizeof(out->password); nvs_get_str(h, "pass", out->password, &sz);
    nvs_close(h);
    return ESP_OK;
}

esp_err_t pvdg_nvs_save_mqtt_config(const pvdg_mqtt_config_t *cfg) {
    nvs_handle_t h;
    esp_err_t err = nvs_open("pvdg_mqtt", NVS_READWRITE, &h);
    if (err != ESP_OK) return err;
    nvs_set_str(h, "host", cfg->host);
    nvs_set_u16(h, "port", cfg->port);
    nvs_set_str(h, "user", cfg->username);
    nvs_set_str(h, "pass", cfg->password);
    nvs_commit(h);
    nvs_close(h);
    return ESP_OK;
}
```

> This is the minimal change to `nvs_store.c` — all other function signatures stay the same, so the copied code from `firmware/esp32/` needs only these additions.

---

### 5.9 Carlo Gavazzi WM15 Meter Adapter (Phase 1 — fix I11)

**Files to create:**
- `firmware/esp32-s3/main/meters/gavazzi_wm15.h`
- `firmware/esp32-s3/main/meters/gavazzi_wm15.c`

**Key registers** (verified from `gateway/src/builtinDriversData/wm15Registers.ts` — all FC04 Input Registers):

> **Register format note:** All multi-byte values are S_DWORD (2 registers, 32-bit signed big-endian). Single-byte values are S_WORD (1 register, 16-bit signed). "address" = Modbus register address (0-based, as sent in FC04 frame).

| Parameter | Address | Format | Scale | Notes |
|-----------|---------|--------|-------|-------|
| Voltage L1-N | 0x0000 | S_DWORD | validate | 2 regs |
| Voltage L2-N | 0x0002 | S_DWORD | validate | |
| Voltage L3-N | 0x0004 | S_DWORD | validate | |
| Voltage L1-L2 | 0x0006 | S_DWORD | validate | line-line |
| Current L1 | 0x000C | S_DWORD | validate | 2 regs |
| Current L2 | 0x000E | S_DWORD | validate | inferred |
| Current L3 | 0x0010 | S_DWORD | validate | |
| Active Power L1 | 0x0012 | S_DWORD | × 1 W | signed |
| Active Power L3 | 0x0016 | S_DWORD | × 1 W | L2 at 0x0014 inferred |
| **Total Active Power** | **0x0028** | **S_DWORD** | **× 0.1 W** | **use for control** |
| Total Apparent Power | 0x002A | S_DWORD | × 0.1 VA | |
| Total Reactive Power | 0x002C | S_DWORD | × 0.1 var | |
| PF L1 | 0x002E | S_WORD | ÷ 1000 | 1 reg |
| PF sys | 0x0031 | S_WORD | ÷ 1000 | |
| **Frequency** | **0x0033** | **S_WORD** | **× 0.1 Hz** | **1 reg only** |
| Import kWh (+) | 0x0034 | S_DWORD | × 0.1 kWh | |
| Export kWh (−) | 0x004E | S_DWORD | × 0.1 kWh | NOT 0x004A |
| THD Current L1 | 0x0082 | S_DWORD | × 0.01 % | |
| THD Voltage L1-N | 0x008A | S_DWORD | × 0.01 % | |

> **Scale "validate":** The gateway file omits explicit scales for voltages and currents. Confirm with physical WM15 on Day 1 — likely 0.1 V/unit and 0.001 A/unit based on Carlo Gavazzi documentation.

> **Corrections vs. DEVICE_REGISTRY.md:** That doc had Current L1 at 0x0003 (wrong), Active Power Total at 0x000C (wrong). Use this table instead.

**gavazzi_wm15.h:**

```c
#pragma once
#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

typedef struct {
    bool ok;
    double voltage_l1_v;
    double voltage_l2_v;
    double voltage_l3_v;
    double current_l1_a;
    double current_l2_a;
    double current_l3_a;
    double power_l1_w;
    double power_l2_w;
    double power_l3_w;
    double total_active_power_w;   // positive = import from grid (same sign as EM500)
    double total_apparent_power_va;
    double total_reactive_power_var;
    double power_factor_sys;
    double frequency_hz;
    double import_energy_kwh;
    double export_energy_kwh;
    double thd_current_l1_pct;
    double thd_voltage_l1_pct;
} pvdg_wm15_grid_t;

esp_err_t pvdg_wm15_read_grid(uint8_t slave_id, pvdg_wm15_grid_t *out);
```

**gavazzi_wm15.c implementation pattern (corrected from gateway wm15Registers.ts):**

```c
static int32_t s32_from_regs(const uint16_t *r) {
    return (int32_t)(((uint32_t)r[0] << 16) | r[1]);
}

esp_err_t pvdg_wm15_read_grid(uint8_t slave_id, pvdg_wm15_grid_t *out) {
    memset(out, 0, sizeof(*out));
    uint16_t regs[52];   // covers 0x0000 to 0x0033

    // Single burst read: addresses 0x0000–0x0033 (52 registers)
    esp_err_t err = pvdg_modbus_read_input_regs(slave_id, 0x0000, 52, regs);
    if (err != ESP_OK) return err;

    // Voltages — S_DWORD (2 regs each); scale to be confirmed on hardware
    // TODO Day 1: verify scale (expected 0.1 V/unit based on Carlo Gavazzi docs)
    out->voltage_l1_v = s32_from_regs(&regs[0x00]) * 0.1;   // addr 0x0000
    out->voltage_l2_v = s32_from_regs(&regs[0x02]) * 0.1;   // addr 0x0002
    out->voltage_l3_v = s32_from_regs(&regs[0x04]) * 0.1;   // addr 0x0004

    // Currents — S_DWORD; scale to be confirmed (expected 0.001 A/unit = mA)
    out->current_l1_a = s32_from_regs(&regs[0x0C]) * 0.001; // addr 0x000C
    out->current_l2_a = s32_from_regs(&regs[0x0E]) * 0.001; // addr 0x000E (inferred)
    out->current_l3_a = s32_from_regs(&regs[0x10]) * 0.001; // addr 0x0010

    // Per-phase active power — S_DWORD, scale 1 W/unit
    out->power_l1_w = s32_from_regs(&regs[0x12]) * 1.0;     // addr 0x0012
    out->power_l2_w = s32_from_regs(&regs[0x14]) * 1.0;     // addr 0x0014 (inferred)
    out->power_l3_w = s32_from_regs(&regs[0x16]) * 1.0;     // addr 0x0016

    // System totals — S_DWORD, scale 0.1 (confirmed in gateway)
    out->total_active_power_w   = s32_from_regs(&regs[0x28]) * 0.1;  // addr 0x0028
    out->total_apparent_power_va = s32_from_regs(&regs[0x2A]) * 0.1; // addr 0x002A
    out->total_reactive_power_var = s32_from_regs(&regs[0x2C]) * 0.1;// addr 0x002C

    // PF system — S_WORD (1 reg), scale ÷1000
    out->power_factor_sys = (int16_t)regs[0x31] / 1000.0;   // addr 0x0031

    // Frequency — S_WORD (1 reg), scale 0.1 Hz (confirmed in gateway)
    out->frequency_hz = (int16_t)regs[0x33] * 0.1;          // addr 0x0033

    // Energy — separate burst read at 0x0034 and 0x004E
    uint16_t eregs[2];
    if (pvdg_modbus_read_input_regs(slave_id, 0x0034, 2, eregs) == ESP_OK)
        out->import_energy_kwh = s32_from_regs(eregs) * 0.1; // addr 0x0034

    if (pvdg_modbus_read_input_regs(slave_id, 0x004E, 2, eregs) == ESP_OK)
        out->export_energy_kwh = s32_from_regs(eregs) * 0.1; // addr 0x004E (NOT 0x004A)

    out->ok = true;
    return ESP_OK;
}
```

> **Sign note:** WM15 `total_active_power_w` is positive when importing from grid — same as EM500. Control bridge negates identically. **Validate scale on Day 1.**

---

### 5.11 Zero Export Control Algorithm (Deadband + Ramp)

Source: MODBUS_INTEGRATION_ROADMAP.md §2.1 + §2.2

#### Zero Export Loop Logic

```
Every 500 ms (control_task cycle):

1. Read grid meter → grid_power_w (+ = importing, - = exporting)
   Negate: export_kw = -(grid_power_w / 1000.0)   [positive = exporting]

2. Apply deadband (±100 W = ±0.1 kW):
   if |export_kw| < 0.1:
     → no action (within tolerance, avoid hunting)

3. If export_kw > 0.1 (exporting to grid):
   excess_kw = export_kw + 0.1    (100W deadband safety margin)
   target_kw = dzx_evaluate_policy(export_kw, stale, gen_running, now)
   → target_kw > 0 means firmware_core wants inverter to reduce output

4. If export_kw < -0.1 (importing from grid, solar headroom available):
   → dzx returns targetKw ≈ 0 → desired_pct = 100% (full production)
   → ramp up slowly (1 %/10 s = 0.5 %/cycle at 500 ms)

5. Ramp limiting:
   Ramp down (curtail): 5 %/s = 2.5 %/cycle → fast response to export
   Ramp up (recover):   1 %/10 s = 0.05 %/cycle → slow to avoid overshoot
   new_pct = clamp(0, 100, last_pct + delta)

6. Write new_pct to inverter via FC06
```

**Updated ramp constants (from MODBUS_INTEGRATION_ROADMAP — replaces §5.5 values):**

```c
// control_task.c — corrected ramp rates
#define RAMP_UP_PCT_PER_CYCLE   0.05   // 1% / 10s @ 500ms cycle = 0.05%/cycle
#define RAMP_DOWN_PCT_PER_CYCLE 2.5    // 5%/s @ 500ms cycle = 2.5%/cycle
```

> **Note:** §5.5 had RAMP_UP=2.0 and RAMP_DOWN=20.0 per cycle — those were per-second values wrongly labeled as per-cycle. The corrected values here match the spec: "1%/10 sec ramp-up, 5%/sec ramp-down".

**Deadband constant:**

```c
#define PVDG_EXPORT_DEADBAND_KW  0.1   // ±100 W — add to app_config.h
```

**Updated `apply_ramp()` + deadband in `control_task.c`:**

```c
#define PVDG_EXPORT_DEADBAND_KW  0.1
#define RAMP_UP_PCT_PER_CYCLE    0.05   // 1%/10s
#define RAMP_DOWN_PCT_PER_CYCLE  2.5    // 5%/s

// In the control loop, replace the ramp block:
if (fabs(export_kw) < PVDG_EXPORT_DEADBAND_KW) {
    // Within deadband — hold current limit, don't hunt
} else {
    double target_kw = dzx_evaluate_policy(export_kw, stale, gen_is_running(), now);
    double inv_kw    = g_poll.inverter.ac_active_power_w / 1000.0;
    double desired_pct = 100.0;
    if (target_kw > 0.0 && inv_max_kw > 0.0) {
        desired_pct = fmax(0.0, fmin(100.0, (inv_kw - target_kw) / inv_max_kw * 100.0));
    }
    double delta = desired_pct - s_last_pct;
    if (delta > 0) delta = fmin(delta, RAMP_UP_PCT_PER_CYCLE);
    else           delta = fmax(delta, -RAMP_DOWN_PCT_PER_CYCLE);
    s_last_pct = s_last_pct + delta;
}
```

#### Generator Load Management

When `gen_is_running()` returns true, firmware_core switches to `generator_min_load` mode:

```
Min load thresholds (from site config):
  Diesel: 30% of rated kW
  Gas/LPG: 50% of rated kW

If gen_load < min_threshold:
  → Reduce solar fast (RAMP_DOWN = 2.5%/cycle)
  → Log: "gen_load=X.Xkw below min Ykw — curtailing solar"

If gen_load > 70% AND solar headroom available:
  → Increase solar slowly (RAMP_UP = 0.05%/cycle)

On gen stop: resume zero_export or limited_export mode
```

The `source_detection.cpp` in firmware_core handles this automatically when `sample.source = "GENERATOR"`.

---

### 5.12 Site Config JSON Schema

`site_json` is the NVS blob that `pvdg_nvs_load_site_json()` loads and `dzx::parseConfig()` parses.  
**This is the contract between the mobile app (PUT /site/config) and the firmware_core policy engine.**

```json
{
  "siteId": "site_abc123",
  "gridConnectionKw": 10.0,
  "exportLimitKw": 0.0,
  "inverterMaxKw": 5.0,
  "policy": {
    "mode": "zero_export",
    "deadbandKw": 0.1,
    "rampUpPctPerSec": 0.1,
    "rampDownPctPerSec": 5.0
  },
  "grid": {
    "meterSlaveId": 1,
    "meterBrand": "rozwell_em500",
    "nominalVoltageV": 230,
    "nominalFrequencyHz": 50
  },
  "inverters": [
    {
      "slaveId": 2,
      "brand": "huawei",
      "model": "SUN2000-5KTL-M0",
      "maxKw": 5.0,
      "stringCount": 2
    }
  ],
  "generators": [
    {
      "id": "gen_1",
      "ratingKw": 20.0,
      "type": "diesel",
      "minLoadPct": 30
    }
  ]
}
```

**Required fields for firmware_core:**
- `policy.mode` — one of: `zero_export`, `limited_export`, `generator_min_load`, `reverse_protection`, `safe_fallback`, `pass_through`
- `exportLimitKw` — used when mode is `limited_export` (0 = zero export)
- `inverterMaxKw` — used to convert `targetKw` → `clamp%` in control_task

**Firmware NVS storage:** Saved as raw UTF-8 JSON string under key `"site_json"` in namespace `"pvdg"`.  
**Version tracking:** `pvdg_nvs_get_config_version()` increments every `PUT /site/config` — control_task hot-reloads when version changes.

---

### Phase 1 Success Criteria

- [ ] Serial log shows `grid=X.XX kW → limit=Y.Y%` every 500 ms
- [ ] Grid export stays within ±150 W of target for 30-min test
- [ ] REST `/telemetry/snapshot` returns real EM500 + Huawei values
- [ ] REST `/control/status` shows current policy mode
- [ ] No crash after 4-hour continuous run

---

## 6. Phase 2: MQTT + WebSocket + Energy History

**Duration:** Weeks 5–7

### 6.1 MQTT Client

**Files to create:**
- `firmware/esp32-s3/main/mqtt_client.h`
- `firmware/esp32-s3/main/mqtt_client.c`

**Add to sdkconfig.defaults:**

```
CONFIG_MQTT_TRANSPORT_TCP=y
```

**Add to main CMakeLists.txt REQUIRES:** `mqtt`

**Topic structure (complete — from MINI_PV_CONTROLLER_PLAN.md §6):**

```
mini-pv/{device_id}/telemetry/grid        ← grid meter snapshot, every 1 s
mini-pv/{device_id}/telemetry/inverter    ← inverter snapshot, every 1 s
mini-pv/{device_id}/telemetry/energy      ← energy analysis, every 1 s
mini-pv/{device_id}/telemetry/system      ← heap, WiFi RSSI, errors, every 60 s
mini-pv/{device_id}/alarms/+              ← alarm events (event-driven, QoS 1)
mini-pv/{device_id}/command/set_limit     ← subscribe: {"pct": 80.0}
mini-pv/{device_id}/status/connection     ← LWT: "online" / "offline"
```

**Payload schemas:**

`telemetry/grid` (published every 1 s):
```json
{
  "ts": 1714732800000,
  "freq_hz": 50.02,
  "v_l1": 231.4, "v_l2": 230.1, "v_l3": 232.0,
  "i_l1": 12.3,  "i_l2": 11.8,  "i_l3": 12.1,
  "p_total_w": -1450.0,
  "q_total_var": 230.0,
  "pf": 0.987,
  "import_kwh": 1234.56,
  "export_kwh": 456.78,
  "online": true
}
```

`telemetry/inverter` (published every 1 s):
```json
{
  "ts": 1714732800000,
  "ac_power_w": 2900.0,
  "dc_power_w": 3050.0,
  "dc_voltage_v": 380.5,
  "efficiency_pct": 95.1,
  "state_code": 1,
  "alarm_code": 0,
  "limit_pct": 67.0,
  "daily_kwh": 14.2,
  "strings": [
    {"id": 1, "v": 192.0, "i": 8.1, "temp_c": 42.0},
    {"id": 2, "v": 190.5, "i": 8.0, "temp_c": 41.5}
  ],
  "online": true
}
```

`telemetry/energy` (published every 1 s):
```json
{
  "ts": 1714732800000,
  "pv_w": 2900.0,
  "grid_w": -1450.0,
  "load_w": 1450.0,
  "export_w": 1450.0,
  "today": {
    "pv_kwh": 14.2,
    "grid_import_kwh": 1.1,
    "grid_export_kwh": 8.3,
    "self_consumption_pct": 41.5
  }
}
```

`alarms/+` (event-driven, QoS 1):
```json
{
  "code": "STALE_DATA",
  "severity": "warning",
  "message": "Grid meter offline — 5 consecutive timeouts",
  "ts_ms": 1714732800000,
  "device_id": "meter_grid_01"
}
```

**Broker config** stored in NVS (provisioned via mobile app):

```c
// nvs_store.h — add:
typedef struct {
    char host[65];
    uint16_t port;
    char username[33];
    char password[65];
} pvdg_mqtt_config_t;

esp_err_t pvdg_nvs_load_mqtt_config(pvdg_mqtt_config_t *out);
esp_err_t pvdg_nvs_save_mqtt_config(const pvdg_mqtt_config_t *cfg);
```

**Reconnect strategy:** exponential backoff (1 s → 2 s → 4 s → 8 s → 60 s max), no blocking of control loop.

### 6.2 WebSocket Server

Extend existing `http_server.c` using `httpd_ws_*` API from ESP-IDF.

**Endpoint:** `GET /ws` (HTTP upgrade to WebSocket)

**Payload:** same JSON as `/telemetry/snapshot`, pushed every 1 s to all connected clients.

**Implementation note:** ESP-IDF's `httpd_ws_send_frame_async()` allows push from any task. Store connected `httpd_handle_t` + `fd` in a small fixed-size array (max 4 clients). Push from the poll task after each cycle.

**Add to main CMakeLists.txt REQUIRES:** (none new — `esp_http_server` already included)

**Add to sdkconfig.defaults:**

```
CONFIG_HTTPD_WS_SUPPORT=y
```

### 6.3 Energy History Ring Buffer

**Files to create:**
- `firmware/esp32-s3/main/energy_history.h`
- `firmware/esp32-s3/main/energy_history.c`

**Storage:** SPIFFS on the `history` partition (10 MB).

**Data model:**

```c
typedef struct __attribute__((packed)) {
    uint32_t unix_ts;          // 4 bytes
    int16_t  grid_w;           // 4 × 2 = 8 bytes  (signed, ±32767 W)
    int16_t  solar_w;
    int16_t  load_w;
    uint8_t  clamp_pct;        // 1 byte
    uint8_t  flags;            // 1 byte (meter_ok, inverter_ok, gen_running)
} pvdg_history_record_t;       // 14 bytes per record
```

**Capacity:**

```
10 MB / 14 bytes = 731,428 records
1 record/minute × 60 × 24 = 1440/day
731,428 / 1440 = 508 days of 1-min resolution
```

**API:** REST endpoint `GET /energy/history?range=24h|7d|30d&resolution=1m|1h|1d`

**Aggregation:** On-the-fly from raw 1-min records; no pre-computation needed.

**SPIFFS init:** call `esp_vfs_spiffs_register()` in app_main before history writes.

### Phase 2 Success Criteria

- [ ] MQTT broker receives telemetry every 1 s without drops
- [ ] WebSocket client (browser dev tools) receives JSON every 1 s
- [ ] `GET /energy/history?range=24h` returns 1440 records
- [ ] History persists across reboot
- [ ] Memory stable after 24-hour run (no heap growth)

---

## 7. Phase 3: Multi-Brand Inverters + Generator Control

**Duration:** Weeks 8–12

### 7.1 Inverter Adapter Pattern

Each brand adapter follows the same interface (matches Huawei pattern):

```c
// firmware/esp32-s3/main/inverters/inverter_iface.h
#pragma once
#include "esp_err.h"

typedef struct {
    bool ok;
    double ac_active_power_w;
    double dc_power_w;
    double daily_energy_kwh;
    uint16_t state_code;
    uint16_t alarm_code;
    double active_power_limit_pct;
} pvdg_inverter_snapshot_t;

typedef struct {
    const char *brand_id;       // "huawei", "growatt", etc.
    esp_err_t (*read)(uint8_t slave_id, pvdg_inverter_snapshot_t *out);
    esp_err_t (*write_limit)(uint8_t slave_id, double pct);
} pvdg_inverter_driver_t;

// Registry: resolved by brand_id string from site config
const pvdg_inverter_driver_t *pvdg_inverter_find_driver(const char *brand_id);
```

**inverter_registry.c — brand lookup:**

```c
// firmware/esp32-s3/main/inverters/inverter_registry.c
#include "inverter_iface.h"
#include "huawei_sun2000.h"
// Phase 3 adapters added here as implemented:
// #include "growatt.h"
// #include "solis.h"

static const pvdg_inverter_driver_t s_drivers[] = {
    {
        .brand_id    = "huawei",
        .read        = pvdg_huawei_read,         // wraps pvdg_huawei_snapshot_t → pvdg_inverter_snapshot_t
        .write_limit = pvdg_huawei_write_active_power_limit,
        .max_rated_w = 0,                         // uses % natively
    },
    // { "growatt", pvdg_growatt_read, pvdg_growatt_write_limit, 0 },
};
static const int s_driver_count = sizeof(s_drivers) / sizeof(s_drivers[0]);

const pvdg_inverter_driver_t *pvdg_inverter_find_driver(const char *brand_id) {
    if (!brand_id) return NULL;
    for (int i = 0; i < s_driver_count; i++) {
        if (strcmp(s_drivers[i].brand_id, brand_id) == 0) return &s_drivers[i];
    }
    return NULL;  // unknown brand → control_task skips write, logs warning
}
```

> **Note:** `pvdg_huawei_read()` in `huawei_sun2000.c` fills `pvdg_huawei_snapshot_t`. Add a thin wrapper that copies the subset fields into `pvdg_inverter_snapshot_t` for the generic interface. The huawei-specific fields (string temps, 3-phase voltages) are still accessible by casting when brand_id == "huawei".

---

### 7.2 Adapter Build Priority (from gateway register maps)

| Priority | Brand | Source File | Key Write Register |
|----------|-------|-------------|-------------------|
| 1 | **Huawei SUN2000** | huaweiInverterRegisters.ts | 0x4640 (FC06, 0–100%) |
| 2 | **Growatt** | growattRegisters.ts | 0x00F5 (FC06, 0–100%) |
| 3 | **Solis** | solisRegisters.ts | 0x0200 (FC06, 0–100%) |
| 4 | **GoodWe** | gcMultilineRegisters.ts | 0x1000 (FC06, 0–100%) |
| 5 | **Knox ASW** | knoxAswRegisters.ts | 0x0E10 (FC06, 0–100%) |
| 6 | **Chint CPS** | cpsChintRegisters.ts | 0x0670 (FC06, 0–max W) |
| 7 | Solax | solaxRegisters.ts | TBD |
| 8 | Sungrow | sungrowRegisters.ts | TBD |
| 9 | **Inverex** | Manual not obtained | ⛔ Blocked — source manual from vendor first |
| 10 | **Fox** | Manual not obtained | ⛔ Blocked — source manual from vendor first |

> **Note I12:** Inverex (Pakistan-focused) and Fox (hybrid) were specified in MODBUS_INTEGRATION_ROADMAP but have no register maps in gateway or docs. Do not start implementation until vendor manuals are obtained.

**Chint CPS uses absolute Watts (fix I13):** Add `max_rated_w` to the driver interface:

```c
typedef struct {
    const char *brand_id;
    esp_err_t (*read)(uint8_t slave_id, pvdg_inverter_snapshot_t *out);
    esp_err_t (*write_limit)(uint8_t slave_id, double pct);
    uint32_t   max_rated_w;   // for brands that use Watts not %; 0 = uses pct natively
} pvdg_inverter_driver_t;
```

Chint CPS driver converts internally: `uint16_t raw = (uint16_t)(pct / 100.0 * max_rated_w);`

**Workflow for each brand:**
1. Read the corresponding `*Registers.ts` file in gateway
2. Extract: read registers for status/power + write register for limit
3. Create `firmware/esp32-s3/main/inverters/{brand}.c/.h`
4. Register in `inverter_driver_registry.c`

### 7.3 Additional Meter Adapters

> **Correction I11:** CLARIFICATIONS.md stated WM15 is Phase 1 (Week 2–3). The master plan deferred it to Phase 3. Promoted back to Phase 1 (alongside Huawei).

| Meter | Source | Phase | Week |
|-------|--------|-------|------|
| **Carlo Gavazzi WM15** | wm15Registers.ts (308 lines) | **Phase 1** | 3–4 |
| Iskra MC3 | iskraMc3Registers.ts (105 lines) | Phase 3 | 9 |
| M4M | m4mRegisters.ts (283 lines) | Phase 3 | 10 |
| KPM37 | PDF manual | Phase 3 | 10 |

Create `firmware/esp32-s3/main/meters/` directory with same adapter pattern as inverters.

### 7.4 Generator Control

**Files to create:**
- `firmware/esp32-s3/main/gen_monitor.h`
- `firmware/esp32-s3/main/gen_monitor.c`

**GPIO configuration:**

```c
// app_config.h
#define PVDG_GEN_RUN_GPIO     5    // active-high (via optocoupler from gen AUX contact)
#define PVDG_GEN_DEBOUNCE_MS  500  // debounce for contact bounce
```

**State machine:**

```
STATES: GEN_OFF → GEN_STARTING (3 s debounce) → GEN_RUNNING → GEN_STOPPING (3 s)

On GEN_RUNNING:
  control_task calls: dzx_evaluate_policy(grid_kw, stale, site_json)
  firmware_core::evaluatePolicy() already handles GENERATOR source:
    → generator_min_load mode
    → targetKw = max(real.kw - minLoadKw, 0)
    → clampPct returned to control_task → written to inverter
```

**Site config gen rating** (already in DZE site config schema):

```json
{
  "generators": [
    { "id": "gen_1", "ratingKw": 20, "type": "diesel" }
  ]
}
```

The `source_detection.ts` (already in firmware_core) detects GENERATOR vs GRID based on meter readings — no GPIO needed for basic detection. GPIO is optional for explicit confirmation.

### Phase 3 Success Criteria

- [ ] Mobile app brand selector shows ≥4 inverter brands
- [ ] Zero-export works on Growatt + Solis (field tested)
- [ ] WM15 meter data appears in telemetry snapshot
- [ ] Generator scenario: solar is curtailed when grid_kw < gen_min_kw
- [ ] GPIO gen_running signal triggers GEN_RUNNING state within 1 s

---

## 8. Phase 4: Mobile App Completion (Parallel with Phases 1–2)

**Duration:** Weeks 3–8 (parallel)

### 8.1 Live Dashboard — Connect to Real Data

**File:** `mobile/src/screens/DashboardScreen.tsx`

Replace mock data with WebSocket subscription:

```typescript
// mobile/src/features/dashboard/useLiveTelemetry.ts
import { useEffect, useRef, useState } from 'react';
import { TelemetrySnapshot } from '../types';

export function useLiveTelemetry(controllerIp: string) {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(`ws://${controllerIp}/ws`);
    ws.current.onmessage = (e) => setSnapshot(JSON.parse(e.data));
    ws.current.onerror = () => ws.current?.close();
    return () => ws.current?.close();
  }, [controllerIp]);

  return snapshot;
}
```

**Power flow diagram:** use `react-native-svg` for animated arrows:

```
[Solar ↓ X kW] → [Controller] → [Grid ↑ Y kW]
                      ↓
                 [Load Z kW]
```

### 8.2 Energy History Charts

**File:** `mobile/src/screens/HistoryScreen.tsx` (new)

```typescript
// Fetch from REST API
GET /energy/history?range=24h&resolution=1h
// Render with react-native-chart-kit or Victory Native
```

**Three tabs:** Today (1-min), Week (hourly), Month (daily)

### 8.3 Role-Based Access Enforcement

**File:** `mobile/src/auth/roles.ts` — already defined. Wire it into navigation:

```typescript
// mobile/src/navigation/RootTabs.tsx
const features = ROLE_FEATURES[userRole];
// Conditionally show Config tab, Export button, Logs tab
```

### 8.4 Alarm Notifications

Subscribe to MQTT topic `mini-pv/{device_id}/alarm` or poll `GET /alarms`.  
Show in-app banner + optional push notification (Expo Notifications).

### Phase 4 Success Criteria

- [ ] Live dashboard updates every 1 s via WebSocket
- [ ] Power flow arrows animate correctly (grid import/export direction)
- [ ] Energy history charts render without lag on Android 11+
- [ ] Owner/Installer/Support role differences are visually distinct
- [ ] Alarm banner appears when grid export is detected

---

## 9. Phase 5: Production Hardening

**Duration:** Weeks 13–16

### 9.1 Watchdog & Fail-Safe

```c
// In control_task: enable task watchdog
#include "esp_task_wdt.h"
esp_task_wdt_add(NULL);  // register current task
// In loop: esp_task_wdt_reset() each cycle

// Fail-safe: if meter offline > 30 s → write 100% (allow full production)
// Rationale: fail-open is safer than shutting down solar system
```

### 9.2 Error Recovery

| Error | Action |
|-------|--------|
| Meter offline (>5 consecutive fails) | Set meter_online=false, raise STALE_DATA alarm, fail-open |
| Inverter write fail (>3 consecutive) | Log error, attempt reset sequence, alert mobile |
| Modbus CRC error | Retry once, increment error counter, continue |
| WiFi disconnect | Firmware keeps running, re-connects in background |
| MQTT disconnect | Reconnect with backoff, no impact on control loop |
| Site config invalid | Use safe defaults (zero export, 5 kW limit) |

### 9.3 OTA Strategy

Current `ota.c` supports download from URL. Extend to:
- Version check: `GET /ota/status` returns current + available version
- Delta OTA: if available, prefer partial flash (esp_delta_ota component)
- Rollback: if new firmware doesn't call `esp_ota_mark_app_valid_cancel_rollback()` within 30 s, auto-roll back

### 9.4 Security

```c
// Token rotation: re-pair generates new UUID token
// MQTT TLS: add CONFIG_MQTT_TRANSPORT_SSL=y when cloud broker used
// REST: enforce HTTPS for production (self-signed cert + LetsEncrypt for cloud-accessible units)
// NVS encryption: enable eFuse-based NVS encryption for production hardware
```

### 9.5 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Control loop latency | < 600 ms end-to-end | Timestamp log |
| Export overshoot | < ±150 W | Grid meter reading |
| Modbus success rate | > 99.5% | Error counter |
| REST API response | < 50 ms | curl timing |
| WebSocket latency | < 200 ms | Browser performance tab |
| MQTT publish rate | 1/s, no drops | Broker stats |
| Heap free (steady state) | > 40 KB | `GET /diagnostics` |
| PSRAM usage | < 50% | PSRAM caps alloc |

---

## 14. Complete REST API Contract

Source: MINI_PV_CONTROLLER_PLAN.md §6 + existing firmware http_server.c.  
All endpoints are prefixed `/api/v1/` except WebSocket and legacy `/whoami`, `/pair`, `/diagnostics`, `/ota`.

### Endpoint Table

| Method | Path | Auth | Phase | Description |
|--------|------|------|-------|-------------|
| GET | `/whoami` | none | 0 | Device identity — returns MAC, IP, firmware version |
| POST | `/pair` | none | 0 | Generate + store pairing token; returns `{"token":"..."}` |
| POST | `/provision_wifi` | token | 0 | Save WiFi SSID/pass to NVS |
| GET | `/provision_status` | token | 0 | Returns `{"status":"connected","ip":"..."}` |
| GET | `/site/config` | token | 0 | Return current site_json |
| PUT | `/site/config` | token | 0 | Save site_json; bumps config version; hot-reload |
| GET | `/telemetry/snapshot` | token | 1 | Live snapshot from g_poll |
| GET | `/control/status` | token | 1 | Policy state, current limit%, cycle count |
| POST | `/device/discover` | token | 1 | Scan RS485 for Modbus slaves |
| GET | `/alarms` | token | 1 | Active alarm list |
| WS | `/ws` | token | 2 | WebSocket — push snapshot every 1 s |
| GET | `/energy/history` | token | 2 | Query ring buffer — params: range, resolution |
| GET | `/energy/export` | token | 2 | CSV/JSON data export |
| GET | `/diagnostics` | token | 0 | Heap, PSRAM, uptime, error counts |
| POST | `/ota` | token | 0 | Trigger OTA firmware update from URL |
| GET | `/system/logs` | token | 3 | Recent event log (last 100 entries) |

### Request / Response Schemas

**`GET /whoami`**
```json
{
  "device_id": "minipv_aabbccddeeff",
  "mac": "AA:BB:CC:DD:EE:FF",
  "ip": "192.168.4.1",
  "fw_version": "0.2.0",
  "hw_target": "esp32-s3",
  "uptime_s": 3600
}
```

**`POST /pair`** — no body required
```json
{ "token": "f47ac10b-58cc-4372-a567-0e02b2c3d479" }
```

**`POST /provision_wifi`**
```json
// Request:
{ "ssid": "HomeNetwork", "password": "secret123" }
// Response:
{ "status": "saved", "ssid": "HomeNetwork" }
```

**`GET /telemetry/snapshot`**
```json
{
  "ts": 1714732800000,
  "grid": {
    "online": true,
    "freq_hz": 50.02,
    "v_l1": 231.4, "v_l2": 230.1, "v_l3": 232.0,
    "i_l1": 12.3,
    "total_power_w": -1450.0,
    "pf": 0.987,
    "import_kwh": 1234.56,
    "export_kwh": 456.78
  },
  "inverter": {
    "online": true,
    "ac_power_w": 2900.0,
    "dc_power_w": 3050.0,
    "state_code": 1,
    "alarm_code": 0,
    "limit_pct": 67.0,
    "daily_kwh": 14.2,
    "strings": [
      { "id": 1, "v": 192.0, "i": 8.1, "temp_c": 42.0 }
    ]
  },
  "energy": {
    "pv_w": 2900.0,
    "grid_w": -1450.0,
    "load_w": 1450.0,
    "today_pv_kwh": 14.2,
    "today_export_kwh": 8.3
  }
}
```

**`GET /control/status`**
```json
{
  "policy_mode": "zero_export",
  "export_kw": 1.45,
  "target_kw": 1.45,
  "inverter_limit_pct": 67.0,
  "gen_running": false,
  "meter_online": true,
  "inverter_online": true,
  "cycle_count": 7241,
  "meter_errors": 0,
  "inverter_errors": 0
}
```

**`POST /device/discover`**
```json
// Request:
{ "port": "A", "baud_rate": 9600, "scan_range": [1, 32] }
// Response:
{
  "devices": [
    { "slave_id": 1, "responding": true, "brand": "rozwell_em500" },
    { "slave_id": 2, "responding": true, "brand": "huawei" }
  ],
  "scan_duration_ms": 3200
}
```

**`GET /alarms`**
```json
{
  "alarms": [
    {
      "code": "STALE_DATA",
      "severity": "warning",
      "message": "Grid meter: 5 consecutive timeouts",
      "ts_ms": 1714732800000,
      "device_id": "meter_grid_01"
    }
  ],
  "count": 1
}
```

**`GET /energy/history?range=24h&resolution=1h`**
```json
{
  "range": "24h",
  "resolution": "1h",
  "records": [
    {
      "ts": 1714730000,
      "grid_w": -1200,
      "solar_w": 3500,
      "load_w": 2300,
      "clamp_pct": 67,
      "flags": 3
    }
  ],
  "count": 24
}
```
`flags` bitmask: bit0 = meter_ok, bit1 = inverter_ok, bit2 = gen_running

**`GET /diagnostics`**
```json
{
  "heap_free": 82432,
  "heap_total": 327680,
  "psram_free": 7340032,
  "psram_total": 8388608,
  "wifi_rssi": -62,
  "uptime_s": 86400,
  "modbus_errors_total": 3,
  "fw_version": "0.2.0",
  "partition": "ota_0"
}
```

### Authentication

All endpoints except `/whoami` require `Authorization: Bearer <token>` header.  
Token is set via `POST /pair` and stored in NVS. Same token used by mobile app throughout lifecycle.  
Token rotation: re-pairing (`POST /pair`) generates a new UUID and invalidates the old one.

---

## 10. Complete File Manifest

### firmware/esp32-s3/main/ — Delivery by Phase

```
Phase 0 (port existing):
  app_config.h            ← update GPIO + version
  main.c                  ← update to call poll/control tasks
  wifi.c / .h             ← copy from esp32
  nvs_store.c / .h        ← copy + extend for MQTT config
  device_id.c / .h        ← copy
  ota.c / .h              ← copy
  http_server.c / .h      ← copy + update mock data → g_poll
  modbus_rtu.c / .h       ← copy + ADD FC06/FC16

Phase 1:
  modbus_poll.c / .h      ← NEW: multi-device poll orchestrator + event group + mutex
  control_task.c / .h     ← NEW: FreeRTOS control loop + ramp limiting
  control_bridge.cpp      ← NEW: C++ bridge (corrected API)
  inverters/
    inverter_iface.h      ← NEW: common interface (+ max_rated_w field)
    inverter_registry.c   ← NEW: brand lookup by string id
    huawei_sun2000.c / .h ← NEW: first inverter adapter (+ string temps)
  meters/
    gavazzi_wm15.c / .h   ← NEW: promoted from Phase 3 (fix I11)
  energy_history.c / .h   ← NEW: SPIFFS ring buffer (moved to Phase 1 — SPIFFS init required early)

Phase 2:
  mqtt_client.c / .h      ← NEW: MQTT publish/subscribe
  websocket_server.c / .h ← NEW: WebSocket push

Phase 3:
  inverters/
    growatt.c / .h        ← NEW
    solis.c / .h          ← NEW
    goodwe.c / .h         ← NEW
    knox_asw.c / .h       ← NEW
    chint_cps.c / .h      ← NEW (uses max_rated_w Watts conversion)
  meters/
    iskra_mc3.c / .h      ← NEW
    kpm37.c / .h          ← NEW
    m4m.c / .h            ← NEW
  gen_monitor.c / .h      ← NEW: generator GPIO state machine

Phase 4 (mobile — parallel):
  mobile/src/features/dashboard/useLiveTelemetry.ts  ← NEW
  mobile/src/screens/HistoryScreen.tsx               ← NEW
  mobile/src/navigation/RootTabs.tsx                 ← UPDATE role gating
```

### Component:
```
firmware/esp32-s3/components/dzx_core/
  CMakeLists.txt          ← NEW: ESP-IDF wrapper for firmware_core
  (links to dynamic_zero_export/firmware_core/src/ and include/)
```

---

## 11. Development Timeline

| Week | Owner | Deliverable |
|------|-------|-------------|
| 1 | FW | Phase 0: esp32-s3 builds, boots, EM500 reads over serial |
| 2 | FW | Phase 1a: FC06 write proven on Huawei bench unit |
| 3 | FW | Phase 1b: firmware_core compiles as IDF component |
| 4 | FW | Phase 1c: control loop running — zero export verified |
| 4 | Mobile | WebSocket client + live dashboard with real data |
| 5 | FW | Phase 2a: MQTT publishing at 1 Hz |
| 6 | FW | Phase 2b: WebSocket server + energy history write |
| 6 | Mobile | Energy history screen (24h chart) |
| 7 | FW | Phase 2c: history query endpoint, 7d/30d views |
| 7 | Mobile | Role-based access, alarm banners |
| 8 | Both | End-to-end integration test (8-hour soak) |
| 9 | FW | Growatt + Solis adapters |
| 10 | FW | GoodWe + Knox adapters |
| 11 | FW | WM15 + Iskra meter adapters |
| 12 | FW | Generator GPIO + control integration |
| 13 | Both | Watchdog, fail-safe, OTA rollback |
| 14 | Both | Security hardening, NVS encryption |
| 15 | Both | Performance tuning, load test |
| 16 | Both | Phase 5 complete — production release |

---

## 12. Decisions Required Before Week 1

| Decision | Options | Recommendation | Deadline |
|----------|---------|----------------|----------|
| **firmware_core: symlink vs copy** | Symlink `dynamic_zero_export/firmware_core/` into components/ OR copy files | Symlink — single source of truth, firmware_core tests still run | Before Week 3 |
| **Fail-safe direction** | Fail-open (100% on meter offline) vs fail-closed (0% on meter offline) | **Fail-open** — prevents nuisance shutdowns; installer can override | Before Week 4 |
| **MQTT broker for Phase 1** | Local Mosquitto vs AWS IoT vs HiveMQ cloud | **Local Mosquitto** on dev machine for Phase 1 | Before Week 5 |
| **Mobile WebSocket vs polling** | WebSocket (push) vs REST polling | **WebSocket** — already planned; lower battery drain | Before Week 4 |
| **Inverex / Fox manuals** | Source manuals vs derive from field samples | Source manuals from vendor | Before Phase 3 |
| **EM500 sign convention validation** | EM500 total_active_power_w: positive=import or positive=export? | **Must bench-test on Day 1.** The control_bridge negates the EM500 value; if sign is wrong, zero-export will invert and maximize export. Serial log should show `exp=+X.XX kW` when visually observing solar → grid export. | **Day 1 of Phase 1** |
| **Inverter max rated kW for clamp% calc** | Read from site config JSON OR hard-coded per model | Read from site config — add `inverterMaxKw` field to site config schema | Before Week 4 |

---

## 13. How Existing Assets Accelerate Each Phase

| Phase | Asset Used | Saves |
|-------|-----------|-------|
| Phase 0 | firmware/esp32/main/ (all 8 source files) | ~3 days of rewrite |
| Phase 1 | firmware_core C++ library (policy_engine, controller) | ~2 weeks of algorithm development |
| Phase 1 | dynamic_zero_export/runtime/policy-engine.ts (reference impl) | Behavior spec |
| Phase 2 | esp_mqtt component (in ESP-IDF) | ~1 week |
| Phase 3 | gateway/src/builtinDriversData/ (14 register maps) | ~3 days per brand |
| Phase 3 | dynamic_zero_export/examples/*.json (10 site configs) | Test coverage |
| Phase 4 | mobile/ (7 screens, Redux, API client) | ~3 weeks of scaffolding |

---

## 15. Commissioning Flow (End-to-End)

Source: DEVICE_REGISTRY.md §5, MINI_PV_CONTROLLER_PLAN.md §7

This is the complete sequence from factory-fresh device to live monitoring. The mobile app must implement this flow. All API calls use the schemas from §14.

### Step 1 — Connect to Controller AP

```
Controller boots fresh → starts WiFi AP "MiniPV-XXXXXX" (last 6 of MAC)
Password: "minipv123" (default, changeable after commissioning)

Mobile: Settings → WiFi → connect to "MiniPV-XXXXXX"
Controller IP: 192.168.4.1 (AP mode default gateway)
```

### Step 2 — Identify Device

```
GET http://192.168.4.1/whoami
→ { "device_id": "minipv_aabbccddeeff", "fw_version": "0.2.0", ... }
```
Mobile saves `device_id` for all future requests.

### Step 3 — Pair

```
POST http://192.168.4.1/pair
→ { "token": "f47ac10b-..." }
```
Mobile stores token in secure storage. All subsequent calls: `Authorization: Bearer f47ac10b-...`

### Step 4 — Provision WiFi

```
POST http://192.168.4.1/provision_wifi
{ "ssid": "HomeNetwork", "password": "secret123" }
→ { "status": "saved" }
```
Controller reboots and connects to site WiFi. Polling `GET /provision_status` (5 s intervals, 60 s timeout) until `"status": "connected"`. Mobile app then switches from AP → site WiFi and reconnects to controller via new IP.

### Step 5 — Discover Modbus Devices

```
POST http://{controller_ip}/api/v1/device/discover     (or /device/discover)
{ "port": "A", "baud_rate": 9600, "scan_range": [1, 32] }
→ {
    "devices": [
      { "slave_id": 1, "responding": true, "brand": "rozwell_em500" },
      { "slave_id": 2, "responding": true, "brand": "huawei" }
    ]
  }
```
User confirms device assignments in mobile app UI.

### Step 6 — Configure Site

```
PUT http://{controller_ip}/site/config
{
  "siteId": "site_abc",
  "inverterMaxKw": 5.0,
  "exportLimitKw": 0.0,
  "policy": { "mode": "zero_export", "deadbandKw": 0.1 },
  "grid": { "meterSlaveId": 1, "meterBrand": "rozwell_em500" },
  "inverters": [{ "slaveId": 2, "brand": "huawei", "maxKw": 5.0 }]
}
→ { "status": "saved", "version": 1 }
```
Config is saved to NVS. Control loop hot-reloads within one cycle (500 ms).

### Step 7 — Verify Live Data

```
GET /telemetry/snapshot
→ { "grid": { "online": true, "total_power_w": -1450 }, "inverter": { "online": true, ... } }
```
Both devices showing `"online": true` = commissioning complete.

### Step 8 — Connect WebSocket (optional, live dashboard)

```javascript
ws = new WebSocket("ws://{controller_ip}/ws")
ws.onmessage = (e) => updateDashboard(JSON.parse(e.data))
```

### Commissioning State Machine (Firmware)

```
BOOT → check NVS:
  ├─ No site_json + no WiFi creds → AP_SETUP mode (LED blinks 1 Hz)
  ├─ WiFi creds exist, no site_json → STA mode, waiting for config (LED blinks 2 Hz)
  └─ WiFi creds + site_json → STA mode, control active (LED solid)

LED GPIO 48 (built-in RGB):
  AP_SETUP:       slow blink (1 Hz) — red
  STA_NO_CONFIG:  fast blink (2 Hz) — yellow
  STA_ACTIVE:     solid — green
  METER_OFFLINE:  solid — orange
  ERROR:          solid — red
```

### Common Commissioning Failures

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `/discover` returns empty | Wrong baud rate or wrong port | Try baud 9600, 19200, 4800 |
| Only meter responds, inverter missing | Inverter slave ID ≠ 2 | Scan range 1–247 |
| `"online": false` after config | Site config slave_id mismatch | Re-run discover, update site config |
| Controller unreachable after WiFi provision | Wrong WiFi password | Hold boot button 5 s → factory reset → redo |
| `provision_status` never "connected" | Hidden SSID or WPA3 only | Check AP settings, use WPA2 |

---

*Document Version: 2.3 — Replaces IMPLEMENTATION_ROADMAP.md and CLARIFICATIONS.md for execution tracking.*  
*v2.1 verified 2026-05-03: 6 critical bugs, 15 important gaps, 5 polish items corrected.*  
*v2.2 additions 2026-05-03: §5.8 nvs_store config-version + MQTT config; §5.9 WM15 Phase 1 adapter; g_poll mutex pattern; inverter_registry.c stub.*  
*v2.3 additions 2026-05-04: §5.9 WM15 registers corrected from gateway; §5.10 verified register maps (EM500/WM15/Huawei — supersedes planning doc errors); §5.11 deadband+ramp algorithm; §5.12 site config JSON schema; §6.1 full MQTT topic+payload; §14 REST API contract (16 endpoints); §15 commissioning flow.*  
*Maintained by: KC PV-DG Team*  
*Next review: After Phase 0 verification (Week 1)*
