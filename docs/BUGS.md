# Tracked bugs (fix later)

## Modbus poll interval: site export vs firmware

**Symptom:** Commissioning / PWA YAML export writes `link.poll_interval_ms: 1000` (1 s) per slot, but the controller does not poll Modbus reads at 1 s.

**Cause:** ESPHome `Modular_Yaml/base_board.yaml` uses substitution `modbus_device_poll_interval: 2s` for all `modbus_controller` `update_interval` values. That path is not driven from `site.config.yaml` / exported `poll_interval_ms`.

**Fix direction:** Map per-slot (or site-wide) `poll_interval_ms` into substitutions or per-controller `update_interval`, and/or align default export with firmware until multi-interval is supported.

**Recorded:** 2026-04-28
