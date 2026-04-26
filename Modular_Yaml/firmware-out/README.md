# PV-DG controller firmware (local build)

Binaries here are **generated on your machine** — they are not downloaded from the network.

Regenerate after YAML or ESPHome changes:

```bash
./scripts/export_pv_dg_firmware.sh
```

| File | Typical use |
|------|-------------|
| `firmware.factory.bin` | Single image for USB flash at **0x0** (when produced by your ESPHome version) |
| `firmware.bin` | Application partition image |
| `firmware.ota.bin` | OTA upload image |
| `bootloader.bin`, `partitions.bin`, `ota_data_initial.bin` | Used by `esptool write_flash` at listed offsets (see ESPHome upload log) |

USB flash from repo root (adjust port):

```bash
esphome run Modular_Yaml/pv-dg-controller.yaml --device /dev/cu.usbserial-XXXX
```

See **`docs/BOARD_FIRMWARE_DOWNLOAD.md`** and **`./scripts/esp_serial_probe.sh`** for ports and troubleshooting.
