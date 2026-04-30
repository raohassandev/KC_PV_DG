# Custom Firmware Onboarding Contract

This contract is used by the Android app to commission a board without serial access after firmware is installed.

## Board Identity

`GET /whoami`

Returns:

```json
{
  "deviceName": "pv-dg-controller",
  "controllerId": "pvdg-...",
  "mac": "AA:BB:CC:DD:EE:FF",
  "ip": "192.168.0.108",
  "fwVersion": "custom-fw",
  "capabilities": {
    "customFirmware": true,
    "provisionWifi": true,
    "siteConfig": true,
    "pairing": true,
    "telemetrySnapshot": true,
    "otaPull": true
  },
  "paired": false
}
```

## Pairing

`POST /pair`

Returns a local controller token on first pairing. Subsequent protected requests use:

`X-PVDG-Token: <token>`

## Wi-Fi Provisioning

`POST /provision_wifi`

```json
{
  "ssid": "Site WiFi",
  "password": "secret"
}
```

`GET /provision_status`

```json
{
  "jobId": "wifi-1",
  "state": "connecting",
  "message": "Joining network"
}
```

## Site Config

`GET /site/config`

`PUT /site/config`

The Android app sends the current site model JSON directly to the controller. Wi-Fi passwords must never be stored in site config.

## Telemetry

`GET /telemetry/snapshot`

Returns the flat mobile dashboard snapshot. EM500 values should be live when RS485 is connected and the configured grid meter Modbus ID is correct.

## Diagnostics

`GET /diagnostics`

Returns runtime health such as uptime, heap, IP, network mode, and RSSI.

## OTA

`POST /ota`

Starts a controller-side OTA pull from a supplied firmware URL.

`GET /ota/status`

Returns OTA state, URL, and latest message.
