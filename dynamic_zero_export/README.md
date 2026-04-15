# dynamic_zero_export

Starter kit for the future `dynamic-Zero-export` firmware branch.

This tree is separate from the current ESPHome + Modular_Yaml + PWA path.

## What this tree contains

- normalized runtime config and policy types
- config loading, normalization, and validation
- policy engine starter logic
- adapter contracts and stubs
- monitoring and commissioning contracts
- test scaffolding
- example site profiles

## Developer workflow

```bash
cd dynamic_zero_export
npm install
npm test
npm run check
```

## Scope

- upstream meter input via RTU or TCP
- downstream virtual meter output toward inverter
- topology-aware policy decisions
- monitoring snapshot generation
- commissioning summary generation

## Non-scope

- production Modbus drivers
- production brand register maps
- current ESPHome firmware path changes

