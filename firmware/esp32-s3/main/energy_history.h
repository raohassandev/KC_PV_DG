#pragma once

#include "esp_err.h"

esp_err_t pvdg_energy_history_init(void);
esp_err_t pvdg_energy_history_start(void);
esp_err_t pvdg_energy_history_read_json(char **out_json);

