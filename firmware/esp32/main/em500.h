#pragma once

#include <stdbool.h>
#include <stdint.h>

typedef struct {
  bool ok;
  // Voltages (V)
  double l1_voltage_v;
  double l2_voltage_v;
  double l3_voltage_v;
  double eqv_voltage_v;

  // Currents (A)
  double l1_current_a;
  double l2_current_a;
  double l3_current_a;
  double eqv_current_a;

  // Per-phase power
  double l1_active_power_w;
  double l2_active_power_w;
  double l3_active_power_w;
  double l1_reactive_power_var;
  double l2_reactive_power_var;
  double l3_reactive_power_var;
  double l1_apparent_power_va;
  double l2_apparent_power_va;
  double l3_apparent_power_va;
  double l1_pf;
  double l2_pf;
  double l3_pf;

  // Totals
  double frequency_hz;
  double total_active_power_w;
  double total_reactive_power_var;
  double total_apparent_power_va;
  double total_pf;

  // Energies (kWh)
  double import_kwh;
  double export_kwh;
  double import_kwh_t1;
  double export_kwh_t1;
  double import_kwh_t2;
  double export_kwh_t2;
} pvdg_em500_grid_t;

bool pvdg_em500_read_grid(uint8_t slave_id, pvdg_em500_grid_t *out);

