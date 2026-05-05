#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "em500.h"
#include "esp_err.h"
#include "inverter_iface.h"

typedef struct {
  bool configured;
  bool online;
  uint8_t slave_id;
  uint32_t success_count;
  uint32_t error_count;
  int64_t last_ok_ms;
  int64_t last_attempt_ms;
  pvdg_em500_grid_t sample;
} pvdg_meter_poll_state_t;

typedef struct {
  bool configured;
  bool online;
  uint8_t slave_id;
  char brand[32];
  uint32_t success_count;
  uint32_t error_count;
  int64_t last_ok_ms;
  int64_t last_attempt_ms;
  pvdg_inverter_snapshot_t sample;
} pvdg_inverter_poll_state_t;

typedef struct {
  bool poller_running;
  uint32_t cycle_count;
  uint32_t registry_version;
  int64_t updated_ms;
  pvdg_meter_poll_state_t grid_meter;
  pvdg_inverter_poll_state_t inverter;
} pvdg_live_snapshot_t;

esp_err_t pvdg_modbus_poll_start(void);
esp_err_t pvdg_modbus_poll_get_snapshot(pvdg_live_snapshot_t *out);

