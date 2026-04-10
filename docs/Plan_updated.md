# PV-DG Smart Controller System Plan
**Board + Mobile App / PWA Strategy**

---

## 1. Project Direction

We will build the PV-DG controller system gradually as a **full product**, based on:

- **KC868-A6 / ESP32 board** for field control
- **ESPHome-based firmware** for current phase
- **Mobile app / web app / PWA** for commissioning, monitoring, configuration, templates, and remote access

The long-term goal is to avoid rewriting YAML manually for every site.

Instead, the engineer will use the app to:

- select the site layout
- choose device templates
- assign roles to meters and inverters
- enter capacities, Modbus IDs, and limits
- generate the correct site firmware/config
- upload locally or remotely

---

## 2. What We Confirmed So Far

### EM500 meter
The live measurement registers are working correctly.

Confirmed working examples:

- Frequency → `0x0032`
- Total Active Power → `0x003A`
- Voltage / current / powers / PF live block works

### EM500 energy
The energy register did **not** work exactly as shown in the PDF on this actual meter.

Confirmed working import-energy read for this device:

- `register_type: holding`
- `address: 0x1B21`
- `value_type: U_QWORD`
- decode fix: divide by `4294967296`
- scale: multiply by `0.01`

This is the currently validated working method for the tested Rozwell/EM500 setup.

### UI conclusion
ESPHome web UI is acceptable for testing and debugging, but it is **not suitable as the final professional operator/engineer UI**.

---

## 3. Final Product Vision

We are now moving toward a **dynamic PV-DG controller system** with two layers:

### Layer A — Board firmware
The board will handle:

- Modbus polling
- local control logic
- inverter control
- source enable/disable logic
- local safety behavior
- fallback operation even without internet

### Layer B — App
The app will handle:

- commissioning
- templates
- monitoring
- configuration
- local discovery
- remote access
- firmware/config generation
- OTA flashing
- backup / restore / cloning sites

---

## 4. Target System Features

### Monitoring
- Grid meters
- Generator meters
- Huawei inverter(s)
- Power, voltage, current, PF, frequency, energy
- Alarm and online/offline status
- Site overview dashboard

### Control
- Zero export
- Limited export
- Limited import
- Generator hold
- Enable/disable each source
- Inverter command write
- Limits, ramps, gains, deadband

### Commissioning
- Device template selection
- Meter role assignment:
  - Grid meter(s)
  - Generator meter(s)
  - Other source meters
- Inverter role assignment
- Capacity entry
- Modbus ID entry
- Save site template
- Clone previous site
- Export/import config

---

## 5. Architecture Decision

We discussed two approaches:

### Option 1 — Fully dynamic runtime firmware
Engineer changes register address, data type, scale, etc. directly at runtime.

### Option 2 — App generates site-specific config/firmware
Engineer selects devices and templates in the app.
The app generates the correct YAML/config and flashes the board.

### Decision
We will follow **Option 2** first.

Why:

- simpler
- more reliable
- easier to debug
- easier to scale
- avoids forcing ESPHome to become a full runtime PLC engine
- allows one commissioning workflow across many sites

---

## 6. Planned UI Strategy

### Short term
Use ESPHome only for:
- testing
- register validation
- firmware bring-up
- service/debugging

### Main UI
Develop a custom:

- **PWA / web app first**
- mobile-friendly interface
- later optional native app if needed

### User roles
#### Operator
- monitor plant
- see alarms/status
- approved control actions

#### Engineer
- full commissioning
- source mapping
- templates
- configuration
- firmware/config deployment

---

## 7. Local and Remote Access Strategy

### Local access
Engineer/operator on same network can:
- discover board
- connect to device
- monitor
- configure
- upload firmware/config

### Remote access
Later phase:
- secure internet access
- remote monitoring
- remote configuration
- OTA update workflow
- fleet/site management

### Communication direction
Likely split:
- **board local control remains autonomous**
- app/backend handles monitoring and config distribution
- remote layer may use MQTT / WebSocket / backend API as needed

---

## 8. Device Template Strategy

We will create reusable templates for fixed supported devices.

### Initial supported devices
- Huawei inverter
- Rozwell / EM500 meter

### Template includes
- register addresses
- data types
- scaling rules
- sign conventions
- control registers
- limits and features

### Engineer workflow
- choose device type
- assign role
- assign Modbus ID
- assign capacity
- save as site template

This removes manual YAML writing for each project.

---

## 9. Development Roadmap

## Phase 1 — Register Validation
- finalize EM500 meter registers
- finalize Huawei inverter registers
- verify sign, scale, and energy decoding
- validate stable polling

## Phase 2 — Stable Board Controller
- build working PV-DG controller firmware
- source enable/disable
- logic modes
- inverter write control
- safer diagnostics and alarms

## Phase 3 — App Prototype
- site setup flow
- device template selection
- local board connection
- monitoring dashboard
- commissioning pages

## Phase 4 — Config Generator
- app generates site config
- export YAML/config
- compile and flash workflow
- save and reuse templates

## Phase 5 — Remote Platform
- remote monitoring
- remote updates
- remote commissioning support
- fleet/site management

---

## 10. Immediate Next Tasks

### Board side
- finish full Huawei + Rozwell controller firmware
- keep accurate EM500 energy decoding
- clean source structure
- define site object model:
  - grid meter slots
  - generator meter slots
  - inverter slots

### App side
- define data model for:
  - site
  - source
  - template
  - role
  - capacity
  - Modbus ID
- design commissioning screens
- design dashboard screens
- design engineer settings flow

---

## 11. Final Conclusion

We are no longer treating this as only an ESPHome page.

We are now building a **full dynamic PV-DG controller product** based on:

- **board for reliable local control**
- **app for commissioning, monitoring, templates, and deployment**
- **progressive move away from hand-written per-site YAML**

### Final agreed direction
- move gradually
- validate hardware and registers first
- build stable controller firmware
- build app-driven commissioning system
- generate/export per-site configuration from the app
- support local first, then remote

---

## 12. Current Status

### Confirmed
- KC868-A6 board working
- RS485 communication working
- Rozwell / EM500 live measurements working
- EM500 import energy decoded successfully with tested correction
- project direction agreed

### Next milestone
**Build the first full Huawei + Rozwell PV-DG controller firmware, then start the commissioning app structure.**
