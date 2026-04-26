**esphome** config **kc868-a6.yaml**

esphome run huawei-rozwell.yml --device /dev/cu.usbserial-1110

esphome run em500_full_test.yaml --device /dev/cu.usbserial-1110

esphome run pv_dg_dynamic_professional_v2.yaml --device /dev/cu.usbserial-1110

esphome config /Users/israrulhaq/Desktop/DEV/KC_PV_DG/Modular_Yaml/pv-dg-controller.yaml --device /dev/cu.usbserial-1110

esphome run /Users/israrulhaq/Desktop/DEV/KC_PV_DG/Modular_Yaml/pv-dg-controller.yaml --device /dev/cu.usbserial-1110

Offline checks (no board): `npm ci` (or `npm install`) in `dynamic_zero_export/` and `PWA/`, then from repo root `npm run verify` (includes Playwright E2E). First time locally, install the browser from `PWA/`: `npx playwright install chromium`.

# KC_PV_DG

# KC_PV_DG




Chat ref
https://chatgpt.com/c/69d7bd3c-bcd0-83a7-8b01-df2ab7344a58


Inventory sheet
https://chatgpt.com/c/69d6a56f-5b1c-83a5-8ae8-13896ae871d5


Flash/OTA the newly compiled firmware to the controller, then refresh PWA.

OTA (if reachable on LAN):

cd /Users/israrulhaq/Desktop/DEV/KC_PV_DG
esphome run Modular_Yaml/pv-dg-controller.yaml --device 192.168.0.111

## Driver Library plan

See `docs/driver_library.md`.