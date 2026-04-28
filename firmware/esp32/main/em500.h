#pragma once

#include <stdbool.h>
#include <stdint.h>

typedef struct {
  bool ok;
  double frequency_hz;
  double total_active_power_w;
  double eqv_voltage_v;
  double eqv_current_a;
  double total_pf;
} pvdg_em500_grid_t;

bool pvdg_em500_read_grid(uint8_t slave_id, pvdg_em500_grid_t *out);

