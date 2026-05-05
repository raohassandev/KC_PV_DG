#pragma once

#include "inverter_iface.h"

const pvdg_inverter_driver_t *pvdg_huawei_sun2000_driver(void);

esp_err_t pvdg_huawei_sun2000_read(uint8_t slave_id, pvdg_inverter_snapshot_t *out);
esp_err_t pvdg_huawei_sun2000_write_limit_pct(uint8_t slave_id, double limit_pct);
