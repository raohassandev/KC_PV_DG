#pragma once

#include "esp_err.h"

typedef struct {
  char device_name[32];
  char controller_id[64];
  char mac[18];
  char ip[16];
  char fw_version[16];
} pvdg_device_id_t;

esp_err_t pvdg_device_id_get(pvdg_device_id_t *out);

