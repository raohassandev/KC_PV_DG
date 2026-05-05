# Mini PV Controller — Device Adapter Registry & Modbus Configuration

**Version:** 1.0  
**Date:** 2026-05-02  
**Status:** Phase 1 Planning

---

## 1. Device Registry Architecture

### Multi-Device Configuration

Each device connected to the Mini PV Controller is identified by:

```typescript
interface ModbusDevice {
  // Unique identifier
  device_id: string;                    // e.g., "meter_grid_01", "inverter_main"
  
  // Network configuration
  network: {
    protocol: 'RTU' | 'TCP';           // RTU: RS485, TCP: Ethernet
    port: 'A' | 'B' | 'TCP';           // RS485 port or TCP gateway
    slave_id?: number;                 // 1-247 (RTU only)
    gateway_ip?: string;               // e.g., "192.168.1.100:502" (TCP only)
    baud_rate?: number;                // Default: 9600 (RTU only)
  };
  
  // Device identification
  brand_id: 'huawei' | 'gavazzi_wm15' | 'rozwell_em500';
  brand_name: string;
  model: string;
  manufacturer_id?: number;
  
  // Polling configuration
  polling: {
    enabled: boolean;
    frequency_ms: number;              // Default: 500ms (2/sec)
    timeout_ms: number;                // Default: 500ms
    retry_count: number;               // Default: 1
    adaptive: boolean;                 // Auto-adjust if latency high
  };
  
  // Data mapping
  register_profile: string;             // Points to adapter profile
  field_overrides?: Record<string, unknown>;  // Custom scaling, etc.
  
  // Status
  online: boolean;
  last_update_ms: number;
  error_count: number;
  error_last_message: string;
}
```

### Storage (NVS)

```
/nvs/device_registry
├── meta
│   ├── version: "1.0"
│   ├── device_count: 2
│   └── last_updated_ms: 1714732800000
├── device_0
│   ├── device_id: "meter_grid_01"
│   ├── network: {"protocol": "RTU", "port": "A", "slave_id": 1, "baud_rate": 9600}
│   ├── brand_id: "rozwell_em500"
│   ├── polling: {"enabled": true, "frequency_ms": 500, "timeout_ms": 500}
│   └── register_profile: "rozwell_em500"
└── device_1
    ├── device_id: "inverter_main"
    ├── network: {"protocol": "RTU", "port": "A", "slave_id": 2, "baud_rate": 9600}
    ├── brand_id: "huawei"
    ├── polling: {"enabled": true, "frequency_ms": 500, "timeout_ms": 500}
    └── register_profile: "huawei_sun2000_5k"
```

---

## 2. Phase 1 Supported Devices

### A. Rozwell EM500 (Grid Meter)

**Device Type:** 3-phase grid meter with energy metering  
**Protocol:** Modbus RTU  
**Baud Rate:** 9600 bps (8N1)  
**Slave ID:** Typically 1  

**Modbus Registers (Input Registers):**

| Register | Address | Description | Unit | Scale |
|----------|---------|-------------|------|-------|
| Frequency | 0x0032 | Grid frequency | Hz | 0.01 |
| Voltage L1-N | 0x003C | Phase A voltage | V | 0.1 |
| Voltage L2-N | 0x003E | Phase B voltage | V | 0.1 |
| Voltage L3-N | 0x0040 | Phase C voltage | V | 0.1 |
| Current L1 | 0x0048 | Phase A current | A | 0.01 |
| Current L2 | 0x004A | Phase B current | A | 0.01 |
| Current L3 | 0x004C | Phase C current | A | 0.01 |
| Active Power Total | 0x003A | Total active power | W | 1 |
| Reactive Power Total | 0x003C | Total reactive power | Var | 1 |
| Power Factor | 0x0044 | Overall PF | — | 0.001 |
| Import Energy | 0x1B21 | Cumulative import | kWh | See below |
| Export Energy | 0x1B23 | Cumulative export | kWh | See below |

**Energy Calculation (Special Parsing):**
- Import/Export: 4 registers (QWORD)
- Value = (raw[0] << 32 | raw[1]) / 4294967296 * 0.01

**Current Implementation:**
- ✅ Implemented in `firmware/esp32/main/em500.c`
- Adapter: `dynamic_zero_export/adapters/brand-profiles/rozwell.ts` (to be created)

**Typical Configuration:**
```json
{
  "device_id": "meter_grid",
  "brand_id": "rozwell_em500",
  "network": {
    "protocol": "RTU",
    "port": "A",
    "slave_id": 1,
    "baud_rate": 9600
  },
  "polling": {
    "enabled": true,
    "frequency_ms": 500
  }
}
```

---

### B. Carlo Gavazzi WM15 (Power Quality Meter)

**Device Type:** 3-phase power quality analyzer  
**Protocol:** Modbus RTU  
**Baud Rate:** 9600 bps (8N1)  
**Slave ID:** 1-247 (configurable, typically 3-10 for non-grid meters)  

**Features:**
- 3-phase voltage, current, frequency
- Active/reactive/apparent power per phase + total
- Power factor per phase + overall
- Harmonic distortion (THD-V, THD-I) — Useful for PQ monitoring
- Per-phase energy import/export (if metering module available)

**Modbus Registers (From Protocol Document):**

| Register | Address | Description | Unit | Scale |
|----------|---------|-------------|------|-------|
| Phase Voltage L1 | 0x0000 | Voltage L1-N | V | 0.1 |
| Phase Voltage L2 | 0x0001 | Voltage L2-N | V | 0.1 |
| Phase Voltage L3 | 0x0002 | Voltage L3-N | V | 0.1 |
| Phase Current L1 | 0x0003 | Current L1 | A | 0.01 |
| Phase Current L2 | 0x0004 | Current L2 | A | 0.01 |
| Phase Current L3 | 0x0005 | Current L3 | A | 0.01 |
| Frequency | 0x0006 | Grid frequency | Hz | 0.01 |
| Active Power L1 | 0x0009 | Power L1 | W | 1 |
| Active Power L2 | 0x000A | Power L2 | W | 1 |
| Active Power L3 | 0x000B | Power L3 | W | 1 |
| Active Power Total | 0x000C | Total active power | W | 1 |
| Power Factor L1 | 0x0013 | PF L1 | — | 0.001 |
| Power Factor L2 | 0x0014 | PF L2 | — | 0.001 |
| Power Factor L3 | 0x0015 | PF L3 | — | 0.001 |
| THD Voltage | 0x0020 | Harmonic distortion (voltage) | % | 0.1 |
| THD Current | 0x0021 | Harmonic distortion (current) | % | 0.1 |

**Phase 1 Implementation:**
- 🔨 To be implemented in Phase 1 Week 2-3
- Create adapter: `firmware/esp32-s3/adapters/gavazzi_wm15.c`
- Create profile: `dynamic_zero_export/adapters/brand-profiles/gavazzi_wm15.ts`

**Typical Configuration:**
```json
{
  "device_id": "meter_quality",
  "brand_id": "gavazzi_wm15",
  "network": {
    "protocol": "RTU",
    "port": "A",
    "slave_id": 3,
    "baud_rate": 9600
  },
  "polling": {
    "enabled": true,
    "frequency_ms": 500
  }
}
```

---

### C. Huawei Sun2000 (Inverter)

**Device Type:** String inverter with multi-MPPT  
**Protocol:** Modbus RTU  
**Baud Rate:** 9600 bps (8N1)  
**Slave ID:** Typically 1 (one inverter per site in Phase 1)  
**Strings Supported:** Up to 24 PV strings (register maps vary by model)

**Key Data Points:**

#### AC Side (Grid Connection)
| Register | Address | Description | Unit | Scale |
|----------|---------|-------------|------|-------|
| AC Voltage Phase A | 0x0202 | Grid voltage (L1-N) | V | 0.1 |
| AC Voltage Phase B | 0x0203 | Grid voltage (L2-N) | V | 0.1 |
| AC Voltage Phase C | 0x0204 | Grid voltage (L3-N) | V | 0.1 |
| AC Current Phase A | 0x0205 | Grid current (L1) | A | 0.01 |
| AC Current Phase B | 0x0206 | Grid current (L2) | A | 0.01 |
| AC Current Phase C | 0x0207 | Grid current (L3) | A | 0.01 |
| AC Frequency | 0x0208 | Grid frequency | Hz | 0.01 |
| Active Power | 0x0209 | Total active power | W | 1 |
| Reactive Power | 0x020A | Total reactive power | Var | 1 |
| Apparent Power | 0x020B | Total apparent power | VA | 1 |
| Power Factor | 0x020C | Overall power factor | — | 0.001 |
| Efficiency | 0x020D | Inverter efficiency | % | 0.01 |

#### DC Side (Solar Array)
| Register | Address | Description | Unit | Scale |
|----------|---------|-------------|------|-------|
| DC Voltage | 0x020E | PV input voltage | V | 0.1 |
| DC Current | 0x020F | PV input current | A | 0.01 |
| DC Power | 0x0210 | PV input power | W | 1 |
| MPP Voltage | 0x0211 | MPPT reference voltage | V | 0.1 |
| MPP Current | 0x0212 | MPPT reference current | A | 0.01 |

#### PV Strings (Per String, Addresses are Template)
```
String 1: Voltage @ 0x3200, Current @ 0x3201, Temp @ 0x3202
String 2: Voltage @ 0x3210, Current @ 0x3211, Temp @ 0x3212
...
String N: Voltage @ 0x3200+0x10*N, Current @ 0x3201+0x10*N, Temp @ 0x3202+0x10*N
```

**String Data Example (String 1):**
| Register | Address | Description | Unit | Scale |
|----------|---------|-------------|------|-------|
| String 1 Voltage | 0x3200 | PV string voltage | V | 0.1 |
| String 1 Current | 0x3201 | PV string current | A | 0.01 |
| String 1 Temp | 0x3202 | Temperature sensor (on combiner) | °C | 0.1 |

#### Energy & Status
| Register | Address | Description | Unit | Scale |
|----------|---------|-------------|------|-------|
| Daily Energy | 0x0262 | Energy today | kWh | 0.01 |
| Lifetime Energy | 0x0263 | Cumulative energy | kWh | 0.1 |
| Inverter State | 0x0089 | Operating state code | — | 1 |
| Alarm Code | 0x008C | Last alarm code | — | 1 |

**Inverter State Codes:**
```
0x0000 = Standby (night)
0x0001 = Grid-connected
0x0002 = Fault (check alarm)
0x0003 = Upgrading
```

**Phase 1 Implementation:**
- 🔨 To be implemented in Phase 1 Week 3-4
- Create adapter: `firmware/esp32-s3/adapters/huawei_sun2000.c`
- Create profile: `dynamic_zero_export/adapters/brand-profiles/huawei.ts`
- Support models: 5KW, 10KW, 20KW (register maps identical for AC/DC/strings)

**Typical Configuration:**
```json
{
  "device_id": "inverter_main",
  "brand_id": "huawei",
  "model": "SUN2000-5KTL-M0",
  "network": {
    "protocol": "RTU",
    "port": "A",
    "slave_id": 2,
    "baud_rate": 9600
  },
  "polling": {
    "enabled": true,
    "frequency_ms": 500,
    "adaptive": true
  }
}
```

**Temperature Note:**
- ✅ String temperatures read via Modbus (one per string)
- ✅ NO physical temperature sensors required
- Source: Integrated temp sensor on Huawei combiner box → Modbus register

---

## 3. Phase 2+ Devices (Not in Scope for MVP)

### Extended Meter Support
- **Eastron SDM series** (SDM120, SDM630) — Single/3-phase
- **ABB PowerLogic** — Advanced power quality
- **Schneider Electric iEM** — Industrial meters

### Extended Inverter Support
- **SMA SunnyBoy / Tripower** — Modbus RTU
- **Growatt SPH / MIC** — Modbus RTU
- **Solax Hybrid** — Modbus RTU/TCP hybrid

### Multi-Protocol Support
- **Modbus TCP/IP** — For sites with Ethernet gateway (PUSR DR302)
- **Sunspec** — Standardized PV register mapping
- **IEC 61850** — Power system automation (high-end only)

---

## 4. Adapter Implementation Pattern

### TypeScript Brand Profile (Mobile & API)

**File:** `dynamic_zero_export/adapters/brand-profiles/huawei.ts`

```typescript
import { BrandProfile } from './base';

export const huaweiProfile: BrandProfile = {
  id: 'huawei',
  name: 'Huawei Sun2000',
  manufacturer_id: 0x0106,  // Huawei's Modbus manufacturer ID
  
  models: {
    'SUN2000-5KTL': {
      max_strings: 8,
      max_power_kw: 5,
      registers: {
        ac_voltage_l1: { address: 0x0202, count: 1, type: 'U16', scale: 0.1 },
        ac_current_l1: { address: 0x0205, count: 1, type: 'U16', scale: 0.01 },
        ac_power: { address: 0x0209, count: 1, type: 'S16', scale: 1 },
        dc_voltage: { address: 0x020E, count: 1, type: 'U16', scale: 0.1 },
        dc_current: { address: 0x020F, count: 1, type: 'U16', scale: 0.01 },
        daily_energy: { address: 0x0262, count: 1, type: 'U16', scale: 0.01 },
      },
    },
  },
  
  stringDataPattern: {
    base_address: 0x3200,
    spacing: 0x10,
    fields: {
      voltage: { offset: 0x00, type: 'U16', scale: 0.1 },
      current: { offset: 0x01, type: 'U16', scale: 0.01 },
      temperature: { offset: 0x02, type: 'S16', scale: 0.1 },
    },
  },
  
  alarmCodes: {
    0x0001: 'Overvoltage',
    0x0002: 'DC overvoltage',
    0x0003: 'Phase loss',
    0x0004: 'Frequency out of range',
    0x0005: 'Overtemperature',
  },
};
```

### C Firmware Adapter (Modbus Driver)

**File:** `firmware/esp32-s3/main/adapters/huawei_modbus.c`

```c
#include "modbus_device.h"

typedef struct {
  double ac_voltage_l1_v;
  double ac_voltage_l2_v;
  double ac_voltage_l3_v;
  double ac_current_l1_a;
  double ac_current_l2_a;
  double ac_current_l3_a;
  double ac_power_w;
  double dc_voltage_v;
  double dc_current_a;
  double dc_power_w;
  struct {
    double voltage_v;
    double current_a;
    double temperature_c;
  } strings[24];
  int string_count;
  double daily_energy_kwh;
  uint16_t alarm_code;
  uint16_t state_code;
} huawei_snapshot_t;

esp_err_t huawei_read_ac_data(uint8_t slave_id, huawei_snapshot_t *out) {
  uint16_t regs[10];
  esp_err_t ret = pvdg_modbus_read_input_regs(slave_id, 0x0202, 10, regs);
  if (ret != ESP_OK) return ret;
  
  out->ac_voltage_l1_v = regs[0] * 0.1;
  out->ac_voltage_l2_v = regs[1] * 0.1;
  out->ac_voltage_l3_v = regs[2] * 0.1;
  out->ac_current_l1_a = regs[3] * 0.01;
  out->ac_current_l2_a = regs[4] * 0.01;
  out->ac_current_l3_a = regs[5] * 0.01;
  out->ac_power_w = (int16_t)regs[7] * 1.0;  // Signed
  
  return ESP_OK;
}

esp_err_t huawei_read_string_data(uint8_t slave_id, int string_id, huawei_snapshot_t *out) {
  if (string_id < 1 || string_id > 24) return ESP_ERR_INVALID_ARG;
  
  uint16_t base_addr = 0x3200 + (string_id - 1) * 0x10;
  uint16_t regs[3];
  esp_err_t ret = pvdg_modbus_read_input_regs(slave_id, base_addr, 3, regs);
  if (ret != ESP_OK) return ret;
  
  out->strings[string_id - 1].voltage_v = regs[0] * 0.1;
  out->strings[string_id - 1].current_a = regs[1] * 0.01;
  out->strings[string_id - 1].temperature_c = (int16_t)regs[2] * 0.1;
  
  return ESP_OK;
}
```

---

## 5. Dynamic Device Discovery & Configuration

### Discovery Procedure (Phone App)

**Flow:**
1. User connects to controller's WiFi AP
2. App sends `POST /api/v1/device/discover`
   ```json
   {
     "port": "A",
     "baud_rate": 9600,
     "scan_range": [1, 247]
   }
   ```
3. Firmware scans all slave IDs on port A
   - Sends Modbus query (e.g., read holding register 0x0000)
   - Collects responses (devices that ACK)
4. For each responding device, reads manufacturer ID + model
5. Matches against brand registry
6. Returns discovered devices:
   ```json
   {
     "devices": [
       {
         "slave_id": 1,
         "brand": "rozwell_em500",
         "model": "EM500-DIN",
         "firmware": "V3.12"
       },
       {
         "slave_id": 2,
         "brand": "huawei",
         "model": "SUN2000-5KTL",
         "firmware": "V1.45.123"
       }
     ]
   }
   ```
7. User selects devices to enable + assigns device_id
8. Firmware saves to NVS + begins polling

### Auto-Configuration (Zero-Touch for Common Sites)

**Predefined Scenarios:**
```c
// File: firmware/esp32-s3/config/common_sites.c

typedef struct {
  const char *site_name;
  const ModbusDeviceConfig devices[10];
} CommonSiteConfig;

const CommonSiteConfig common_sites[] = {
  {
    .site_name = "Residential 5KW + Smart Meter",
    .devices = {
      { .device_id = "meter_grid", .brand_id = "rozwell_em500", .slave_id = 1, .port = 0 },
      { .device_id = "inverter", .brand_id = "huawei", .slave_id = 2, .port = 0 },
      NULL
    }
  },
  {
    .site_name = "Commercial 20KW + Power Quality",
    .devices = {
      { .device_id = "meter_grid", .brand_id = "gavazzi_wm15", .slave_id = 1, .port = 0 },
      { .device_id = "inverter_1", .brand_id = "huawei", .slave_id = 2, .port = 0 },
      { .device_id = "inverter_2", .brand_id = "huawei", .slave_id = 3, .port = 0 },
      NULL
    }
  }
};

esp_err_t load_common_site_config(int site_index) {
  if (site_index >= ARRAY_SIZE(common_sites)) return ESP_ERR_INVALID_ARG;
  // Save to NVS...
}
```

---

## 6. Error Handling & Resilience

### Modbus Error Codes

```c
typedef enum {
  MB_ERR_OK = 0,
  MB_ERR_TIMEOUT = 1,           // No response within 500ms
  MB_ERR_CRC_MISMATCH = 2,       // Checksum failed
  MB_ERR_INVALID_SLAVE = 3,      // Slave ID not responding
  MB_ERR_EXCEPTION_CODE = 4,     // Modbus exception (e.g., illegal address)
  MB_ERR_INVALID_RESPONSE = 5,   // Response malformed
  MB_ERR_QUEUE_FULL = 6,         // Polling queue overflow
} ModbusError;
```

### Recovery Strategy

```
Device goes offline:
├─ Increment error_count
├─ If error_count > 5 consecutive:
│  ├─ Mark device offline
│  ├─ Reduce poll frequency to 10/min (timeout detection)
│  └─ Emit alert to mobile app
├─ On recovery:
│  ├─ Clear error_count
│  ├─ Restore poll frequency
│  └─ Mark online
└─ If offline > 1 hour: persist event to log
```

### Logging & Diagnostics

```json
{
  "timestamp": 1714732800000,
  "device_id": "inverter_main",
  "event": "OFFLINE",
  "reason": "timeout_after_3_retries",
  "duration_minutes": 45,
  "error_count_total": 152
}
```

---

## 7. Modbus Polling Orchestration (Firmware)

### Multi-Device Concurrent Polling

**Pseudocode (C/FreeRTOS):**

```c
#define MODBUS_TASK_PRIORITY 8
#define MODBUS_POLL_CYCLE_MS 1000

void modbus_polling_task(void *arg) {
  ModbusDeviceRegistry registry;
  load_device_registry(&registry);
  
  while (1) {
    uint32_t cycle_start_ms = get_time_ms();
    
    // Stagger polls: device 0 at T=0, device 1 at T=200, etc.
    for (int i = 0; i < registry.device_count; i++) {
      uint32_t poll_offset_ms = i * 200;
      while (get_time_ms() - cycle_start_ms < poll_offset_ms) {
        vTaskDelay(pdMS_TO_TICKS(10));
      }
      
      ModbusDevice *dev = &registry.devices[i];
      esp_err_t err = modbus_poll_device(dev);
      
      if (err == ESP_OK) {
        dev->error_count = 0;
        dev->online = true;
      } else {
        dev->error_count++;
        if (dev->error_count > 5) dev->online = false;
      }
      
      dev->last_update_ms = get_time_ms();
    }
    
    // Publish composite snapshot
    telemetry_publish_snapshot();
    
    // Wait until next cycle
    uint32_t elapsed = get_time_ms() - cycle_start_ms;
    if (elapsed < MODBUS_POLL_CYCLE_MS) {
      vTaskDelay(pdMS_TO_TICKS(MODBUS_POLL_CYCLE_MS - elapsed));
    }
  }
}
```

### Adaptive Frequency (If Time Permits)

```c
if (dev->last_update_ms - dev->last_poll_start_ms < 100) {
  // Round-trip time < 100ms: can support 5/sec
  dev->frequency_ms = 200;  // 5 cycles/sec
  ESP_LOGI(TAG, "Device %s: fast mode (5/sec)", dev->device_id);
} else if (rtt < 300) {
  dev->frequency_ms = 500;   // 2 cycles/sec
} else {
  dev->frequency_ms = 1000;  // 1 cycle/sec (high latency)
}
```

---

## 8. Mobile App Reusable Components

### Device Telemetry Display (React Native)

```typescript
// components/DeviceTelemetry.tsx
interface DeviceTelemetryProps {
  device: ModbusDevice;
  data: DeviceSnapshot;
  fieldMappings: Array<{
    key: string;
    label: string;
    unit: string;
    precision: number;
  }>;
}

export const DeviceTelemetry: React.FC<DeviceTelemetryProps> = ({
  device,
  data,
  fieldMappings,
}) => {
  return (
    <ScrollView>
      {fieldMappings.map((field) => (
        <MetricRow
          key={field.key}
          label={field.label}
          value={data[field.key]}
          unit={field.unit}
          precision={field.precision}
          status={device.online ? 'ok' : 'offline'}
        />
      ))}
    </ScrollView>
  );
};
```

### Role-Based Feature Flags

```typescript
// auth/roles.ts
export interface RoleFeatures {
  canViewTelemetry: boolean;
  canConfigureDevices: boolean;
  canAcknowledgeAlarms: boolean;
  canExportData: boolean;
  canViewLogs: boolean;
}

export const ROLE_FEATURES: Record<UserRole, RoleFeatures> = {
  owner: {
    canViewTelemetry: true,
    canConfigureDevices: true,
    canAcknowledgeAlarms: true,
    canExportData: true,
    canViewLogs: true,
  },
  installer: {
    canViewTelemetry: true,
    canConfigureDevices: true,
    canAcknowledgeAlarms: true,
    canExportData: true,
    canViewLogs: false,
  },
  support: {
    canViewTelemetry: true,
    canConfigureDevices: false,
    canAcknowledgeAlarms: false,
    canExportData: true,
    canViewLogs: true,
  },
};
```

---

**Document Version:** 1.0  
**Created:** 2026-05-02  
**Next Review:** After Phase 1 Week 1 (device discovery spike)
