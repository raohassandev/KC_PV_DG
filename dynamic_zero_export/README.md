# dynamic_zero_export

Policy/runtime support package for the custom PV-DG controller.

## What This Tree Contains

- normalized runtime config and policy types
- config loading, normalization, and validation
- policy engine starter logic
- adapter contracts and stubs
- monitoring and commissioning contracts
- test scaffolding
- example site profiles

## Developer Workflow

```bash
cd dynamic_zero_export
npm install
npm test
npm run check
```

From the repository root, `npm run verify` runs Dynamic Zero Export checks plus the Android TypeScript check.

## Scope

- upstream meter input via RTU or TCP
- downstream virtual meter output toward inverter
- topology-aware policy decisions
- monitoring snapshot generation
- commissioning summary generation

## Non-Scope

- production Modbus drivers beyond the firmware work in `firmware/esp32`
- production brand register maps until hardware validation is complete
