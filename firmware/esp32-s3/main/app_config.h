#pragma once

// Device identity
#define PVDG_DEVICE_NAME      "pv-dg-controller"
#define PVDG_FW_VERSION       "0.2.0"
#define PVDG_HW_TARGET        "esp32-s3"

// Wi-Fi bootstrap
#define PVDG_STA_CONNECT_TIMEOUT_MS  (12 * 1000)
#define PVDG_SOFTAP_SSID_PREFIX      "PV-DG-"
#define PVDG_SOFTAP_PASSWORD         "pvdg-setup"
#define PVDG_SOFTAP_CHANNEL          6
#define PVDG_SOFTAP_MAX_CONN         4

// Modbus RTU (RS-485) — UART1 only; UART0 is the debug console (GPIO 43/44)
#define PVDG_MB_UART         UART_NUM_1
#define PVDG_MB_TX_GPIO      17
#define PVDG_MB_RX_GPIO      16
#define PVDG_MB_RTS_GPIO     18   // DE/RE for MAX485 half-duplex control
#define PVDG_MB_BAUD         9600

// Optional second RS-485 bus (Phase 3+)
#define PVDG_MB2_UART        UART_NUM_2
#define PVDG_MB2_TX_GPIO     19
#define PVDG_MB2_RX_GPIO     20
#define PVDG_MB2_RTS_GPIO    11

// GPIO — ESP32-S3 DevKitC-1 board-specific
#define PVDG_STATUS_LED_GPIO  48   // Built-in RGB LED
#define PVDG_GEN_RUN_GPIO      5   // Generator running (optocoupler, Phase 3)

// Zero-export control loop
#define PVDG_EXPORT_DEADBAND_KW      0.1    // ±100 W deadband
#define PVDG_RAMP_UP_PCT_PER_CYCLE   0.05   // 1 %/10 s at 500 ms cycle
#define PVDG_RAMP_DOWN_PCT_PER_CYCLE 2.5    // 5 %/s at 500 ms cycle
#define PVDG_CONTROL_CYCLE_MS        500
