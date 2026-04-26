#!/usr/bin/env bash
# List macOS/Linux callout serial devices and probe likely ESP32 UART ports with esptool.
# Usage: ./scripts/esp_serial_probe.sh
set -u
shopt -s nullglob 2>/dev/null || true

echo "=== Callout ports: /dev/cu.* (prefer these for esptool / esphome on macOS) ==="
for p in /dev/cu.*; do
  [[ -e "$p" ]] || continue
  base="${p##*/}"
  hint=""
  case "$base" in
    *Bluetooth*) hint="  [skip: Bluetooth]" ;;
    *debug-console*) hint="  [skip: Apple debug console]" ;;
    *usbserial*|*usbmodem*|*SLAB_USBtoUART*|*wchusbserial*)
      hint="  <-- USB serial: try ESP32 here"
      ;;
  esac
  printf '  %s%s\n' "$p" "$hint"
done

echo ""
if ! command -v esptool.py >/dev/null 2>&1 && ! command -v esptool >/dev/null 2>&1; then
  echo "esptool not in PATH (install: pip install esptool, or use the Python env that ships with ESPHome)."
  exit 0
fi
ESPTOOL=esptool.py
command -v "$ESPTOOL" >/dev/null 2>&1 || ESPTOOL=esptool

echo "=== Probing USB serial ports for ESP32 (chip_id, 115200, 5 attempts) ==="
for p in /dev/cu.usbserial-* /dev/cu.usbmodem* /dev/cu.SLAB_USBtoUART* /dev/cu.wchusbserial*; do
  [[ -e "$p" ]] || continue
  echo ""
  echo "--- $p ---"
  "$ESPTOOL" --port "$p" --chip esp32 --baud 115200 --before default_reset --after no_reset \
    --connect-attempts 5 chip_id 2>&1 | tail -12 || true
done

echo ""
echo "If every probe shows 'No serial data received': use a data USB cable, close other serial apps,"
echo "install CP210x/CH340 driver if needed, and put the board in bootloader (hold BOOT, tap EN, release BOOT, run this script again)."
