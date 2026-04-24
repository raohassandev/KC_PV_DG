# Commissioning information architecture — why each area exists

This document explains the **purpose** of major PWA surfaces, how they stay **user-friendly**, and where **expert** workflows remain intentional.

## Design principles

1. **Operation vs Commissioning** — Operators see live status and safe controls; installers see topology, mapping, export, and fleet sync. Reduces accidental deep edits during routine monitoring.
2. **Assignment vs documentation** — Anything that changes *what runs on site* lives in forms (Site Setup, Topology, Source Slots). Read-only narrative lives in **Templates**, presented as **in-app documentation** (single-column reader), not as another multi-column “settings” dashboard.
3. **Progressive disclosure** — Advanced slot catalog, hardware summary in the header, and YAML export are available but not on the default path.

---

## Workspaces

| Area | Exists because | User-friendly? |
|------|----------------|----------------|
| **Operation** | Day-to-day monitoring and (when enabled) Dynamic Zero Export. | Yes — limited tabs, role-gated. |
| **Commissioning** | Structured site bring-up without editing raw YAML first. | Yes for guided steps; YAML remains an expert escape hatch. |

---

## Commissioning pages (installer / manufacturer)

### Site Setup

- **Why:** Identity (site name, board IP, Wi-Fi), **Find Controller** (probe / LAN scan / AP provisioning), gateway fleet load/save when deployed with a gateway.
- **Configure:** All fields are plain forms; discovery actions are explicit buttons with notices.
- **Gaps:** Raw Modbus register editing is *not* here by design — that belongs in firmware packages and bundled YAML.

### Topology

- **Why:** Electrical layout (single vs dual bus, ties, zones) drives validation, export, and later control logic.
- **Configure:** Wizard-style choices rather than free-text topology DSL.

### Source Slots (Source + Inverter mapping)

- **Why:** This is the **authoritative assignment** of device types, Modbus transport (RTU vs TCP), unit IDs, and capacities per slot — what the exported `site.config` and operator views rely on.
- **Configure:** Yes — primary installer workflow.

### Templates *(documentation tab)*

- **What it is:** **Embedded documentation** in the commissioning shell — same role as a chapter in an install manual, not a standalone “app feature.”
- **Why it exists:** Answers “**what register / meter / inverter work is validated vs pending?**” and “**what control philosophy does the firmware implement?**” without bloating **Source Slots**.
- **What it is not:** Not device binding — that stays in **Source Slots**. Not a second grid of forms — the UI uses a **narrow, single-column reader** so the mental model is “read,” not “tweak two panels side by side.”
- **Who uses it:** Installers skim for context; manufacturers use it for traceability (`Modular_Yaml/*`, `docs/*`).
- **Layout note:** Commissioning **forms** still use a two-column `section-grid` where side-by-side fields help (e.g. Site Identity). **Templates** deliberately opts out of that pattern.

### Validation

- **Why:** One screen to see policy warnings, topology consistency, and derived zones before export or gateway save.
- **Configure:** Profile name + save/load snapshot; warnings are read-mostly.

### YAML Export

- **Why:** Auditable artifact and integration with ESPHome / CI; some teams still diff YAML.
- **User-friendly?** Expert — expected audience is manufacturer or advanced installer.

### Engineer Actions *(manufacturer only)*

- **Why:** Dangerous or board-specific actions isolated from normal commissioning.
- **User-friendly?** No — intentionally restricted by role.

### Dynamic Zero Export *(Operation, mode-gated)*

- **Why:** Separate product surface when `controllerRuntimeMode === dzx_virtual_meter`.
- **Configure:** Within DZX feature pages; hidden in sync-controller mode to avoid wrong expectations.

---

## Sensibility review — “can everything be configured in a user-friendly way?”

| Topic | Status |
|-------|--------|
| Site identity, board IP, discovery | **Yes** — forms + buttons; last-known IP and apply-discovery reduce confusion. |
| Slot / transport / TCP host | **Yes** — per-slot fields with hints. |
| Topology | **Yes** — constrained choices. |
| Control limits / policy | **Yes** — numeric and enum fields where modeled in `SiteConfig`. |
| Fleet gateway sync | **Yes** when gateway is deployed; otherwise hidden. |
| Raw ESPHome package composition | **Partial** — YAML export is power-user; full “no YAML ever” would need more packaged presets in firmware. |
| Every future meter PDF | **No** — catalogs remain reference; firmware YAML catches up per device. |

---

## Related docs

- `docs/onboarding_contract.md` — HTTP contracts for board identity and AP provisioning.
- `Modular_Yaml/modbus_tcp_manager.yaml` — TCP sidecar pattern for mixed RTU + TCP builds.
