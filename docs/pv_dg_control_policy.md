# PV-DG Control Policy

Last updated: 2026-04-15

## 1. Scope

This document defines the normalized control policy for the ESPHome-based PV-DG sync controller and the commissioning PWA that generates site YAML.

The controller:
- reads source and inverter data over Modbus
- detects topology and active source per control zone
- calculates safe PV inverter output limits
- writes inverter percentage setpoints
- applies deadband, ramping, and fail-safe behavior

The controller does not:
- start or stop generators
- open or close breakers
- transfer sources
- synchronize sources
- switch power paths
- override plant protection

## 2. Non-scope

Outside scope for this controller:
- generator auto-start/stop
- breaker automation
- ATS logic
- phase synchronization switching
- islanding / microgrid protection relays
- inverter firmware modification
- utility metering certification logic

## 3. Terminology

- `Site`: the physical plant or commissioning target.
- `Topology`: how buses, sources, and inverter groups are arranged.
- `Control zone`: a logical area controlled by one policy and one PV target.
- `Source`: the active supply feeding a zone, usually `GRID` or `GENERATOR`.
- `Meter`: a Modbus device that reports power, status, or health.
- `Inverter group`: one or more inverters controlled as a unit.
- `Net metering`: site mode where grid export is allowed or managed.
- `Export setpoint`: desired export/import power target when grid-connected policy requires it.
- `Reverse power`: power flow from the generator bus back into the generator.
- `Minimum loading`: the minimum safe load a running generator must maintain.
- `Deadband`: small error range where control output does not change.
- `Ramp`: limit on how fast PV command can move per control cycle.
- `Fast drop`: an immediate or high-priority reduction when generator risk is detected.
- `Ambiguous`: a state where the controller cannot safely determine the active source or topology.

## 4. Sign Conventions

Unless a site-specific mapping says otherwise:
- Grid import from utility is positive.
- Grid export to utility is negative.
- Generator power output is positive when the generator is supplying the bus.
- PV inverter power output is positive when producing power.
- Reverse power risk increases when generator measured power approaches zero or changes sign in an unsafe direction.

If a site uses a different sign convention, the PWA must store that as an explicit mapping and the generated YAML must normalize it before control logic consumes the value.

## 5. Policy Philosophy

The system is topology-aware and policy-driven.

Rules:
- topology describes the electrical shape
- policy describes the operating philosophy
- mapping describes the physical devices
- control zones combine topology and policy into safe PV targets

Do not encode one-off site branching in firmware.
Do not use site names or project numbers as control logic.
Use reusable policy objects with validation.

## 6. Topology Model

Supported topology types:
- `SINGLE_BUS`
- `SINGLE_BUS_MULTI_GEN`
- `DUAL_BUS`
- `DUAL_BUS_SEPARATE`
- `DUAL_BUS_COMBINED`

Topology dimensions:
- number of buses
- number of generators
- number of inverter groups
- whether a tie signal exists
- whether each inverter group belongs to bus A, bus B, or both

Rules:
- topology is a structural model, not a policy
- a site can have one or more control zones
- a zone is derived from topology plus current combined/separate state

## 7. Source Model

Supported source states:
- `GRID`
- `GENERATOR`
- `NONE`
- `AMBIGUOUS`

Source detection comes from:
- breaker status
- generator running status
- generator meter power
- grid meter power
- tie status for dual-bus sites
- debounce and health checks

If the source cannot be determined safely, return `AMBIGUOUS` and enter fail-safe behavior.

## 8. Control Zones

A control zone is a logical area with one PV control target.

Examples:
- whole single-bus site
- bus A
- bus B
- combined A+B network

Each zone contains:
- local source
- local meter inputs
- local inverter groups
- local policy
- fail-safe state

Control zones may be:
- fixed
- derived from topology
- merged when the site is combined

## 9. Grid Policy

When the active source in a zone is grid:

### 9.1 Net metering ON
The site may allow:
- full production
- export setpoint mode

Full production mode:
- PV target = available PV or configured cap
- grid export may be allowed

Export setpoint mode:
- PV target is adjusted to maintain a chosen export or import target
- if target is zero export, controller aims near zero with deadband

### 9.2 Net metering OFF
Controller must use zero-export behavior:
- keep grid export at or above the configured zero-export limit
- apply deadband to avoid hunting
- apply ramp limits to avoid abrupt oscillation

## 10. Generator Policy

When the active source in a zone is generator:

### 10.1 Generator type defaults
- Diesel minimum loading: 30% of generator rating
- Gas minimum loading: 50% of generator rating

These are defaults, not hardcoded limits. They may be overridden if commissioning explicitly approves a different safe value.

### 10.2 Minimum loading rule
The controller must preserve generator load above the configured minimum.

PV may only take the excess above the safe load threshold.

### 10.3 Reverse protection
The controller must reduce PV quickly when:
- generator load approaches zero
- reverse power is detected
- generator power sign indicates unsafe backfeed

### 10.4 Multi-generator rule
For multiple generators:
- evaluate aggregate loading
- evaluate each running generator individually if individual measurements exist
- use the most conservative risk

If one generator is at risk, reduce PV for the whole zone unless a more granular inverter mapping exists and is explicitly configured.

## 11. Dual-Bus Policy

### 11.1 Separate operation
If the site is separate:
- bus A and bus B are controlled independently
- each zone uses its local source and local inverter group(s)
- zone policies may differ

### 11.2 Combined operation
If the tie indicates combined operation:
- treat the site as one combined zone if topology allows it
- compute one combined target
- distribute target across inverter groups based on capacity and availability

### 11.3 Ambiguous tie state
If combined vs separate cannot be determined safely:
- do not assume combined
- freeze or reduce output according to fail-safe policy
- show a warning in the PWA

## 12. Control Laws

Common controller layers:

1. source detection
2. topology detection
3. zone construction
4. policy selection
5. safe target calculation
6. inverter target distribution
7. percent conversion
8. ramping and deadband
9. fail-safe override

## 13. Inverter Percent Conversion

The controller calculates a desired power target in kW and converts it to inverter percent output using:

`percent = target_kw / rated_kw * 100`

Rules:
- clamp to min/max percent
- distribute across groups if multiple inverter groups exist
- respect per-group capacity and availability

## 14. Ramping and Deadband

Deadband:
- ignore small errors inside the configured threshold

Ramp up:
- limit how fast the PV command increases

Ramp down:
- limit how fast the PV command decreases unless fast-drop is required

Fast drop:
- may bypass normal ramping when generator minimum load or reverse power risk is detected

## 15. Fail-Safe Behavior

The controller must enter fail-safe when:
- Modbus data is stale
- a required signal is missing
- topology is invalid
- active source is ambiguous
- tie state is unknown on a dual-bus site that depends on it
- inverter mapping is invalid
- commissioning config is incomplete

Fail-safe action depends on policy:
- hold last safe command briefly if allowed
- otherwise reduce output toward a safe minimum
- never increase PV output during uncertainty

## 16. Required Signals

### Mandatory
- site topology
- inverter group mapping
- control mode
- inverter percent write register mapping
- at least one source meter per control zone

### Strongly recommended
- breaker or tie status for dual-bus sites
- generator running status
- generator power measurement
- inverter health or enable status
- stale-data timeout values

### Optional
- source fault state
- generator health state
- individual inverter availability
- manual bypass switch
- customer-specific notes

### Derived
- active source
- combined/separate state
- control zone list
- zone target kW
- inverter command percent
- risk state

### Simulated
- mock board data
- development-only site profiles

## 17. Commissioning Parameters

Site configuration must expose:
- topology type
- number of generators
- generator type for each generator
- generator rating
- inverter group count
- inverter group ratings
- network assignment
- tie signal presence
- net metering enabled
- grid operating mode
- export setpoint
- zero-export deadband
- reverse margin
- minimum loading defaults
- ramp up/down
- fast drop
- stale-data timeout
- manual bypass option
- fallback mode

## 18. Mapping Notes for PWA and YAML

PWA responsibilities:
- collect topology and policy inputs
- validate the configuration
- show warnings and derived zones
- save/load site profiles
- generate YAML and JSON snapshots
- preview the final policy summary

ESPHome responsibilities:
- expose the actual sensor/switch/number/select entities
- perform control calculations
- apply safe fail-over logic
- publish status and diagnostics

The generated YAML must be derived from the same policy schema the PWA uses.

## 19. Assumptions

- Grid and generator measurements are available over Modbus where required.
- Inverter setpoint control is percent-based.
- Site operators will confirm site-specific sign conventions during commissioning.
- Dual-bus combined state can be determined with a tie or equivalent signal if configured.
- Generator minimum load defaults are safe starting points, not universal standards.

## 20. Edge Cases

- Grid meter missing but generator active
- Generator running but load signal stale
- Two generators with only one meter available
- Dual bus with tie signal missing
- Combined state ambiguous during transfer
- Inverter group offline while zone remains active
- One inverter group on bus A and another on bus B
- generator load below threshold while PV command is ramping up
- net metering enabled but export target set to zero

## 21. Acceptance Criteria

The system is acceptable when:
- the PWA can configure topology and policy without raw YAML editing
- the generated YAML matches the configured site model
- the controller chooses safe targets for grid and generator policies
- dual-bus combined and separate states are handled explicitly
- inverter output is reduced quickly during generator risk
- fail-safe behavior is deterministic
- Huawei inverter command write remains clearly marked pending until site validation

## 22. Example Site Profiles

### 22.1 One grid, one generator
```yaml
topology:
  type: SINGLE_BUS
sources:
  - grid
  - generator
policy:
  net_metering_enabled: true
  grid_operating_mode: export_setpoint
  export_setpoint_kw: 0
  generator_minimum_load_pct:
    diesel: 30
    gas: 50
```

### 22.2 One grid, two generators
```yaml
topology:
  type: SINGLE_BUS_MULTI_GEN
sources:
  - grid
  - generator_1
  - generator_2
policy:
  net_metering_enabled: false
  grid_operating_mode: zero_export
  reverse_margin_kw: 2
```

### 22.3 One grid, three generators
```yaml
topology:
  type: SINGLE_BUS_MULTI_GEN
sources:
  - grid
  - generator_1
  - generator_2
  - generator_3
policy:
  net_metering_enabled: false
  grid_operating_mode: zero_export
  fast_drop_pct: 25
```

### 22.4 Dual network separate or combined
```yaml
topology:
  type: DUAL_BUS
  tie_signal_present: true
operating_state:
  separate: DUAL_BUS_SEPARATE
  combined: DUAL_BUS_COMBINED
inverter_groups:
  - bus_a
  - bus_b
policy:
  zone_allocation: derived from tie state
```
