#pragma once

#include "esp_err.h"

typedef enum {
  PVDG_NET_UNKNOWN = 0,
  PVDG_NET_STA_CONNECTED,
  PVDG_NET_SOFTAP,
} pvdg_net_mode_t;

esp_err_t pvdg_wifi_init(void);
esp_err_t pvdg_wifi_start_bootstrap(void);
pvdg_net_mode_t pvdg_wifi_mode(void);
esp_err_t pvdg_wifi_get_ip(char out_ip[16]);  // returns ESP_OK if known
esp_err_t pvdg_wifi_get_rssi(int *out_rssi_dbm);  // STA mode only

// Provisioning hook used by HTTP handler:
esp_err_t pvdg_wifi_request_connect(const char *ssid, const char *password);

