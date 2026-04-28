#include "em500.h"

#include <string.h>

#include "modbus_rtu.h"

static uint32_t u32_from_regs(const uint16_t regs[2]) {
  return ((uint32_t)regs[0] << 16) | (uint32_t)regs[1];
}

static int32_t s32_from_regs(const uint16_t regs[2]) {
  return (int32_t)u32_from_regs(regs);
}

bool pvdg_em500_read_grid(uint8_t slave_id, pvdg_em500_grid_t *out) {
  if (!out) return false;
  memset(out, 0, sizeof(*out));

  // Addresses are from `Modular_Yaml/meter_em500_grid.yaml` (FC04 read/input registers).
  // Frequency: 0x0032 U_DWORD * 0.001
  // Eqv voltage: 0x0034 U_DWORD * 0.01
  // Eqv current: 0x0038 U_DWORD * 0.0001
  // Total active power: 0x003A S_DWORD * 0.01
  // Total PF: 0x0040 S_DWORD * 0.0001
  uint16_t r2[2];

  if (pvdg_modbus_read_input_regs(slave_id, 0x0032, 2, r2) != ESP_OK) return false;
  out->frequency_hz = (double)u32_from_regs(r2) * 0.001;

  if (pvdg_modbus_read_input_regs(slave_id, 0x0034, 2, r2) != ESP_OK) return false;
  out->eqv_voltage_v = (double)u32_from_regs(r2) * 0.01;

  if (pvdg_modbus_read_input_regs(slave_id, 0x0038, 2, r2) != ESP_OK) return false;
  out->eqv_current_a = (double)u32_from_regs(r2) * 0.0001;

  if (pvdg_modbus_read_input_regs(slave_id, 0x003A, 2, r2) != ESP_OK) return false;
  out->total_active_power_w = (double)s32_from_regs(r2) * 0.01;

  if (pvdg_modbus_read_input_regs(slave_id, 0x0040, 2, r2) != ESP_OK) return false;
  out->total_pf = (double)s32_from_regs(r2) * 0.0001;

  out->ok = true;
  return true;
}

