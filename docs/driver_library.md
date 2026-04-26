## Driver Library (Manufacturer)

### Purpose
Make meter/inverter “drivers” (register maps + scaling + byte/word order) manageable **inside the product UI**, so Manufacturer can:
- browse which drivers exist (EM500, Huawei, etc.)
- tune minor parameters without a development environment
- create new drivers with a guided form
- let commissioning engineers select a driver and generate the correct ESPHome YAML bundle

### Phase rollout
- **Phase 1 (now)**: Gateway runs locally on the commissioning PC and stores drivers as JSON files (atomic writes).
- **Phase 2 (later)**: Same gateway deployed to a VPS with a persistent writable volume for the config directory.
- **Offline future**: add “Download driver pack for offline use” (PWA caches in IndexedDB) + import/export driver pack JSON.

### Storage (Phase 1 + Phase 2)
- **Gateway storage path**: `CONFIG_DIR/drivers/*.json`
- **Access control**:
  - Manufacturer: create/edit/delete drivers
  - Installer: read drivers to select during commissioning

### What a driver contains
- **Metadata**: name, vendor, device type (meter/inverter), notes, recommended poll interval
- **Register list**:
  - parameter name/key
  - register type (read/holding/coil/discrete input)
  - address (hex or decimal)
  - value type (U_WORD/S_WORD/U_DWORD/S_DWORD/U_QWORD/S_QWORD/FP32)
  - scaling (multiply or ratio)
  - **byte/word order** (ABCD/CDAB/BADC/DCBA and word-swap)

### YAML generation contract
During commissioning, the selected driver(s) are used to generate an ESPHome modular YAML package and included in the exported bundle:
- Use native ESPHome `value_type` swaps where available (`*_R` types).
- For full byte-order variants not representable directly, generate an ESPHome `lambda:` to reorder bytes from the raw Modbus response.

### Key code entry points (implementation)
- Gateway API: add `/api/drivers` routes and a file-backed driver store.
- PWA: add a Manufacturer “Drivers” page (Library/Edit/New).
- Commissioning: add driver selection fields and persist selected driver ids in `SiteConfig`.
- Bundle generator: emit modular YAML per selected driver and include it via `packages:`.

