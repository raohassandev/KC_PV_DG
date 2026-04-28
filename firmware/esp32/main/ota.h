#pragma once

#include "esp_err.h"

typedef struct {
  char state[16];   // idle|downloading|applying|done|failed
  char message[96];
  char url[256];
} pvdg_ota_status_t;

void pvdg_ota_init(void);
esp_err_t pvdg_ota_start(const char *url);
void pvdg_ota_get_status(pvdg_ota_status_t *out);

