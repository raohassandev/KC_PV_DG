#pragma once

#include "esp_err.h"

typedef struct {
  char ssid[33];
  char password[65];
} pvdg_wifi_creds_t;

esp_err_t pvdg_nvs_init(void);
esp_err_t pvdg_nvs_load_wifi(pvdg_wifi_creds_t *out);
esp_err_t pvdg_nvs_save_wifi(const pvdg_wifi_creds_t *creds);

// Site config is stored as opaque JSON (future: parse/validate).
esp_err_t pvdg_nvs_load_site_json(char **out_json);   // malloc()'d, caller frees
esp_err_t pvdg_nvs_save_site_json(const char *json);

