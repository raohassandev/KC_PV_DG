#!/usr/bin/env bash
# Build ESPHome firmware and copy flashable artifacts to Modular_Yaml/firmware-out/
# Usage (repo root): ./scripts/export_pv_dg_firmware.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
YAML="$ROOT/Modular_Yaml/pv-dg-controller.yaml"
BUILD="$ROOT/Modular_Yaml/.esphome/build/pv-dg-controller/.pioenvs/pv-dg-controller"
OUT="$ROOT/Modular_Yaml/firmware-out"

cd "$ROOT"
echo "Compiling: $YAML"
esphome compile "$YAML"
mkdir -p "$OUT"
for f in firmware.bin firmware.factory.bin firmware.ota.bin bootloader.bin partitions.bin ota_data_initial.bin; do
  if [[ -f "$BUILD/$f" ]]; then
    cp -f "$BUILD/$f" "$OUT/$f"
    echo "  copied $f"
  fi
done
echo ""
echo "Artifacts (flash / OTA):"
ls -lh "$OUT"/*.bin 2>/dev/null || true
echo ""
echo "Full path: $OUT"
