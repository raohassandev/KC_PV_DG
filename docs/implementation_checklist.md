# PV-DG Implementation Checklist

Last updated: 2026-04-15

**Agent / status overview:** see **`docs/AGENT_IMPLEMENTATION_PLAN.md`** — gateway + PWA software milestones are **complete**; remaining checklist rows are mainly **board / ESPHome** field work.

This checklist is the repo-aware migration order for the current ESPHome + PWA commissioning product.

## Stage A. Stabilize current board contract

Goal: keep the current lab-verified board behavior stable while the policy model grows.

Files:
- `PWA/src/boardEntityMap.ts`
- `PWA/src/boardApi.ts`
- `PWA/src/boardWriteApi.ts`
- `Modular_Yaml/service_ui.yaml`

Tasks:
- keep existing read/write entity names stable
- keep controller enable, grid meter enable, inverter enable, control mode, and numeric writes working
- keep the web endpoint assumptions unchanged
- do not remove the inverter write gate

Acceptance:
- board reads still work against `192.168.0.111`
- board writes still work for current validated settings
- no regression in current EM500 path

## Stage B. Keep the canonical schema separate

Goal: keep the normalized site model explicit and reusable.

Files:
- `PWA/src/siteProfileSchema.ts`
- `PWA/src/policySchema.ts`
- `PWA/src/siteTemplates.ts`

Tasks:
- keep `siteProfileSchema.ts` as the canonical schema
- keep `policySchema.ts` for derived zones and warnings
- keep `siteTemplates.ts` as catalog/helper compatibility only
- avoid adding new model fields to the helper layer unless they are catalog-only

Acceptance:
- the canonical config type remains the source of truth
- helper layers do not own the schema

## Stage C. Improve topology-aware commissioning UX

Goal: make the PWA field-engineer friendly for real sites.

Files:
- `PWA/src/App.tsx`
- `PWA/src/App.css`
- `PWA/src/components/EngineerActions.tsx`

Tasks:
- keep the following UI sections:
  - Site Identity
  - Topology Wizard
  - Source Mapping
  - Inverter Mapping
  - Validation
  - Engineer Actions
  - YAML Preview
- keep the advanced slot catalog hidden by default
- keep notification feedback for save/load/export actions
- keep topology and policy fields visible and editable

Acceptance:
- source mapping and inverter mapping are visible before the advanced catalog
- validation shows derived zones and warnings
- notice bar appears on save/load/export

## Stage D. Expand bundle generation

Goal: emit commissioning artifacts that reflect the normalized policy model.

Files:
- `PWA/src/siteBundleGenerator.ts`

Tasks:
- keep the current root bundle shape
- emit:
  - `pv-dg-controller.generated.yaml`
  - `site.config.yaml`
  - `site.contract.yaml`
  - `commissioning.summary.yaml`
- include:
  - topology
  - policy
  - source mapping
  - inverter mapping
  - derived zones
  - warnings

Acceptance:
- the YAML preview shows the commissioning summary artifact
- the bundle remains compatible with the current modular firmware direction

## Stage E. Keep docs synchronized

Goal: make the repo explain itself to future contributors and commissioning staff.

Files:
- `docs/pv_dg_control_policy.md`
- `docs/site_profile_examples.md`
- `docs/KC_PV_DG_Handover.md`
- `docs/Plan.md`
- `docs/Plan_updated.md`

Tasks:
- keep the policy reference current
- keep example profiles current
- keep handover notes aligned with the current lab/on-site split
- explicitly mark Huawei/inverter command control as pending until site validation

Acceptance:
- docs reflect current repo structure and pending work
- docs do not suggest a rewrite or a different architecture

## Stage F. Extend firmware policy gradually

Goal: move from grid-centric control toward topology-aware policy without breaking the board.

Files:
- `Modular_Yaml/control_core.yaml`
- `Modular_Yaml/service_ui.yaml`
- `Modular_Yaml/meter_em500_grid.yaml`
- `Modular_Yaml/inverter_huawei.yaml`

Tasks:
- keep the current grid control loop stable
- add policy metadata gradually
- add generator minimum-load logic only after site-safe validation
- add dual-bus behavior only as explicit configuration, not hidden branching

Acceptance:
- current grid modes remain working
- new policy fields do not break the existing lab firmware

## Stage G. Add validation and tests

Goal: keep the commissioning system safe and predictable.

Files:
- `PWA/src/policySchema.ts`
- `PWA/src/siteBundleGenerator.ts`
- `PWA/src/App.tsx`
- `docs/implementation_checklist.md`

Tasks:
- validate topology combinations
- validate missing required mappings
- validate dual-bus tie-signal requirements
- validate commissioning summary generation
- validate profile save/load round-trip

Acceptance:
- invalid topology configurations produce warnings
- bundle generation remains deterministic
- the UI keeps working in the live browser

## Recommended next commit-sized tasks

1. Add explicit source/network assignment fields to the schema.
2. Add generator type and rating fields per generator source.
3. Add inverter group network assignment and percent write mapping fields.
4. Extend bundle generation with a clearer zone policy section.
5. Add validation rules for dual-bus and multi-generator combinations.
6. Add sample profiles for:
   - 1 grid + 1 generator
   - 1 grid + 2 generators
   - 1 grid + 3 generators
   - dual bus separate
   - dual bus combined

