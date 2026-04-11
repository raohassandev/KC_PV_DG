# KC_PV_DG Verified Project Facts (Strict Handover)

## 1. Project goal

### Purpose
PV–DG controller to:
- read electrical parameters (grid, inverter, generator)
- control inverter output
- maintain desired grid import/export behavior

### Problem to solve
- prevent grid export (zero export)
- limit export/import
- balance power between grid + PV + DG

### Done definition
- EM500 working (confirmed)
- control loop running (exists)
- inverter control working (NOT DONE)
- PWA commissioning working (NOT DONE)

---

## 2. Hardware

### Confirmed
- Controller: KC868-A6 (ESP32)
- Grid meter: EM500 / Rozwell

### Partial
- Inverter: Huawei (model unknown)

### Unknown
- Generator meter model
- IO wiring
- OLED usage final state

---

## 3. Communication

### Confirmed
- RS485 Modbus RTU
- 9600 baud, 8N1

### Addresses
- EM500: ID 1 (working)
- Huawei: ID 10 (not verified)

### Status
- EM500 working
- Huawei not verified
- Generator not verified

---

## 4. Protocol / Registers

### EM500 verified
Scaling:
- voltage/current/power: ×0.01

### Energy (critical)
Working config:
- address: 0x1B21
- type: U_QWORD
- scale: /4294967296 ×0.01

Manual mismatch confirmed.

### Huawei
- registers: unknown
- write method: unknown

---

## 5. Control logic

Modes:
- grid_zero_export → target 0 kW
- grid_limited_export → negative limit
- grid_limited_import → positive limit

Core:
error = target - measured

Output:
- pv_cmd_percent
- pv_cmd_kw

Limiter:
- deadband
- gain
- ramp step
- min/max %

Failsafe:
- disabled → output 0

---

## 6. PWA

### Current
- dashboard (live working)
- site setup
- slots
- templates
- engineer actions
- YAML preview

### Behavior
- reads via /sensor/<name>
- uses JSON value field

### Future
- YAML generation
- remote control

---

## 7. Naming contract

### Working names (examples)
- /sensor/Grid Frequency
- /sensor/Grid Total Active Power
- /sensor/Grid Import Energy
- /text_sensor/Grid Meter Status
- /text_sensor/Controller State

Rule:
- exact names required
- URL encoded

Status:
- not finalized → risk

---

## 8. Blockers

1. Huawei inverter not working
2. Write API not verified
3. No read-back sync
4. Naming mismatch risk
5. Logger crash history

---

## 9. Workflow

Firmware:
- esphome run pv-dg-controller.yaml

PWA:
- npm run dev

Testing:
- local bench only
- inverter requires site

Secrets:
- secrets.yaml required

---

## 10. Immediate next task

### Task
Verify write API between PWA and board

### Expected
- change control mode
- enable/disable controller
- set limits

### Verify
- use browser POST endpoints
- confirm ESPHome logs
- confirm state update via API

---

## Unresolved Questions

1. Huawei model?
2. Huawei register map?
3. inverter command method?
4. generator meter?
5. final entity naming?
6. fail-safe definition?
7. YAML vs live config approach?
8. deployment model?
