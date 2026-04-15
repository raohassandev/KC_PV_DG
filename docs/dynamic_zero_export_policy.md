# Dynamic Zero Export Policy

Last updated: 2026-04-15

## 1. Scope

This document defines the policy model for the **dynamic-Zero-export** custom-firmware branch.

The controller:
- reads the real site meter upstream
- normalizes meter data
- applies topology-aware policy math
- generates virtual meter values downstream
- exposes those values to the inverter as a Modbus meter / emulated meter
- supports pass-through, adjusted, and fail-safe modes

The controller does not:
- start or stop generators
- open or close breakers
- transfer sources
- synchronize sources
- replace inverter native protection logic

## 2. Non-scope

Outside scope:
- ATS control
- generator auto-start/stop
- breaker automation
- grid protection relay replacement
- inverter vendor firmware modification
- cloud monitoring dependency

## 3. Terminology

- `Upstream meter`: the real meter read by the controller.
- `Downstream meter`: the virtual meter exposed toward the inverter.
- `Virtual meter`: controller-generated Modbus meter output.
- `Policy engine`: logic that converts real readings into virtual readings.
- `Zone`: a logical section of the site controlled by one policy.
- `Pass-through mode`: virtual meter mirrors the real meter.
- `Adjusted mode`: virtual meter is offset by policy math.
- `Fail-safe`: safe fallback when data or topology is invalid.
- `Combined bus`: two buses treated as one logical zone.
- `Separate bus`: two buses controlled independently.

## 4. Sign conventions

Recommended default:
- grid import from utility = positive
- grid export to utility = negative
- generator output = positive
- PV output = positive

If a brand profile requires a different convention, the profile must declare it explicitly and the normalization layer must convert it before policy math.

## 5. Topology model

Supported topology types:
- `SINGLE_BUS`
- `SINGLE_BUS_MULTI_GEN`
- `DUAL_BUS`
- `DUAL_BUS_SEPARATE`
- `DUAL_BUS_COMBINED`

Topology is structural, not policy.

Topology defines:
- number of buses
- number of generators
- inverter group assignment
- whether tie/breaker state is needed to detect combined/separate operation

## 6. Source model

Supported source states:
- `GRID`
- `GENERATOR`
- `NONE`
- `AMBIGUOUS`

Source detection may use:
- Modbus meter power
- generator running status
- breaker status
- tie status
- stale-data timers

If the controller cannot determine source safely, it must return `AMBIGUOUS` and enter fail-safe behavior.

## 7. Control zones

Each zone contains:
- source mapping
- meter input
- generator policy
- inverter group assignment
- local safety rules

Zone examples:
- whole single-bus site
- bus A
- bus B
- combined A+B zone

## 8. Grid policy

### Net metering ON
Options:
- full production
- export setpoint

### Net metering OFF
Behavior:
- zero export
- deadband to avoid hunting
- ramp limits to prevent oscillation

## 9. Generator policy

When generator is active:
- preserve minimum loading
- reduce PV quickly when generator load becomes too low
- avoid reverse-power pushback
- protect each running generator as well as the aggregate zone

Default minimum loading:
- Diesel: 30% of rating
- Gas: 50% of rating

These are defaults, not universal truths.

## 10. Reverse protection behavior

The controller must reduce PV when:
- generator load approaches reverse threshold
- generator power sign indicates unsafe backfeed
- generator minimum loading is endangered

Fast reduction should outrank normal ramp-up.

## 11. Dual-bus behavior

### Separate
- bus A and bus B are controlled independently
- each zone has its own source and inverter mapping

### Combined
- treat both buses as one logical zone
- use tie/breaker detection if available
- distribute target across inverter groups

### Ambiguous
- do not assume combined
- enter safe behavior
- warn the engineer

## 12. Virtual meter concept

The controller exposes a downstream Modbus meter representation to the inverter.

Modes:
- `pass-through`: virtual values equal real measured values
- `adjusted`: virtual values are offset to satisfy policy
- `safe-fallback`: virtual values are clamped to conservative behavior

The inverter then applies its own native export-limit or zero-export control using that virtual meter.

## 13. Brand profile concept

The branch must support brand-specific adapter profiles for downstream meter emulation.

Examples of future profiles:
- Huawei
- Solis
- GoodWe
- Growatt

Profiles may define:
- register map
- scaling
- sign conventions
- supported meter type
- inverter-facing compatibility behavior

## 14. Fail-safe behavior

Fail-safe must trigger when:
- meter data is stale
- meter source is missing
- topology is ambiguous
- tie signal is missing on a topology that depends on it
- inverter emulation profile is invalid
- comms are lost

Fail-safe actions:
- freeze or reduce output
- clamp virtual meter to safe values
- raise alarm
- preserve last known safe state only if allowed by policy

## 15. Assumptions

- The upstream meter is always authoritative when available.
- The inverter understands the emulated meter format defined by the selected profile.
- A commissioning engineer can set topology and policy through the UI.
- The branch is LAN/WiFi local, not cloud-dependent.

## 16. Edge cases

- one generator online, one stale
- dual bus combined but tie signal lost
- upstream meter via DR302 gateway but inverter on serial
- inverter profile mismatch
- meter source sign inversion
- all sources mapped to one network in a dual-bus topology

## 17. Acceptance criteria

The policy is acceptable when:
- real meter values are normalized correctly
- virtual meter output matches policy mode
- generator minimum load protection works
- dual-bus separate/combined behavior is explicit
- brand profiles can be added without redesigning the engine
- fail-safe behavior is deterministic

