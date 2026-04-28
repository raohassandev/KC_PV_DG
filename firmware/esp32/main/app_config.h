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

// Modbus RTU (RS-485) defaults (adjust per board wiring)
#define PVDG_MB_UART UART_NUM_1
#define PVDG_MB_TX_GPIO 17
#define PVDG_MB_RX_GPIO 16
#define PVDG_MB_RTS_GPIO 18  // DE/RE control for RS-485 transceiver
#define PVDG_MB_BAUD 9600

