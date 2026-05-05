#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"

#define PVDG_INVERTER_MAX_STRINGS 24

typedef struct {
  double voltage_v;
  double current_a;
  double temperature_c;
  bool valid;
} pvdg_pv_string_snapshot_t;

typedef struct {
  bool online;
  double ac_voltage_l1_v;
  double ac_voltage_l2_v;
  double ac_voltage_l3_v;
  double ac_current_l1_a;
  double ac_current_l2_a;
  double ac_current_l3_a;
  double ac_frequency_hz;
  double ac_power_w;
  double reactive_power_var;
  double apparent_power_va;
  double power_factor;
  double efficiency_pct;
  double dc_voltage_v;
  double dc_current_a;
  double dc_power_w;
  double daily_energy_kwh;
  double lifetime_energy_kwh;
  uint16_t state_code;
  uint16_t alarm_code;
  double active_power_limit_pct;
  uint8_t string_count;
  pvdg_pv_string_snapshot_t strings[PVDG_INVERTER_MAX_STRINGS];
} pvdg_inverter_snapshot_t;

typedef struct {
  const char *brand_id;
  const char *display_name;
  uint32_t max_rated_w;
  esp_err_t (*read_snapshot)(uint8_t slave_id, pvdg_inverter_snapshot_t *out);
  esp_err_t (*write_limit_pct)(uint8_t slave_id, double limit_pct);
} pvdg_inverter_driver_t;
