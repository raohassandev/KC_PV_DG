#pragma once

// Device identity (compile-time defaults)
#define PVDG_DEVICE_NAME "pv-dg-controller"
#define PVDG_FW_VERSION "0.1.0"

// Wi-Fi bootstrap
#define PVDG_STA_CONNECT_TIMEOUT_MS (12 * 1000)
#define PVDG_SOFTAP_SSID_PREFIX "PV-DG-"
#define PVDG_SOFTAP_PASSWORD "pvdg-setup"
#define PVDG_SOFTAP_CHANNEL 6
#define PVDG_SOFTAP_MAX_CONN 4

