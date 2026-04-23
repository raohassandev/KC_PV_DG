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

`npm test` includes `api_simulator` HTTP tests. From the repository root, `npm run verify` runs Dynamic Zero Export checks plus PWA tests and production build.

Local stack with the commissioning PWA (two terminals): run `npm run sim` here (port 8787), then from `PWA` run `npm run dev`. The Vite dev server proxies `/api` to the simulator, and the PWA uses same-origin `/api` in development when no `dzx.apiBaseUrl` is set.

On-site or lab with a **real controller** that exposes this contract over HTTP, set `dzx.apiBaseUrl` in the Connectivity screen (or `VITE_DZX_API_BASE_URL` at build time) to `http://<board-ip>` so the Dynamic Zero Export tabs call the device instead of the simulator.

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

