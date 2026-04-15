# Dynamic Zero Export Commissioning

Last updated: 2026-04-15

## 1. Commissioning workflow

1. Enter site identity.
2. Select topology.
3. Define real meter input source.
4. Define inverter-facing virtual meter profile.
5. Map generators and inverter groups.
6. Configure policy.
7. Validate warnings.
8. Save commissioning profile.
9. Push config to controller.
10. Verify live telemetry and virtual meter response.

## 2. Required hardware signals

Minimum required:
- upstream site meter
- inverter-facing communication path
- topology definition
- controller LAN/WiFi access

For generator sites:
- generator running status
- generator rating
- generator type

For dual-bus sites:
- tie/breaker signal or equivalent combined/separate indicator

## 3. Meter-source options

Supported upstream meter sources:
- Modbus RTU over serial/RS485
- Modbus TCP/IP over LAN/WiFi gateway such as DR302

Commissioning must capture:
- protocol type
- address / IP / port
- slave ID if applicable
- baud/parity if RTU
- polling interval
- timeout / retry policy

## 4. Inverter-facing emulation options

The controller may emulate:
- a meter that the inverter expects
- a pass-through meter
- an adjusted meter for policy enforcement

Commissioning must capture:
- inverter brand/profile
- emulated meter type
- register map profile
- serial settings or downstream transport
- inverter compatibility flags

## 5. Policy fields

Required policy inputs:
- net metering ON/OFF
- zero export / export setpoint mode
- export setpoint kW
- zero-export deadband
- diesel minimum load %
- gas minimum load %
- reverse margin kW
- ramp up/down
- fast drop
- meter timeout
- fallback mode

## 6. Validation rules

Warn or block on:
- missing upstream meter
- missing inverter emulation profile
- dual-bus site without tie indicator
- generator site with no generator ratings
- multiple networks on a single-bus topology
- conflicting sign conventions

## 7. Commissioning checklist

- verify controller LAN access
- verify upstream meter reads live
- verify inverter-facing meter response
- verify topology state
- verify warnings are understood
- verify zero export / limited export mode
- verify generator minimum load behavior
- verify fail-safe response

## 8. Test checklist

- stale meter data test
- inverter comms loss test
- dual-bus separate/combined test
- generator minimum load test
- reverse protection test
- pass-through mode test
- adjusted mode test
- fail-safe rollback test

## 9. Failure modes and recovery

Failure examples:
- meter timeout
- wrong register map
- wrong inverter profile
- ambiguous topology
- broken gateway
- WiFi/LAN drop

Recovery:
- return to safe fallback
- report alarm
- preserve commissioning profile
- retry comms
- allow engineer override if policy permits

