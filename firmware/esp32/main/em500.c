#include "em500.h"

#include <string.h>

#include "modbus_rtu.h"

static uint32_t u32_from_regs(const uint16_t regs[2]) {
  return ((uint32_t)regs[0] << 16) | (uint32_t)regs[1];
}

static uint64_t u64_from_regs(const uint16_t regs[4]) {
  return ((uint64_t)regs[0] << 48) | ((uint64_t)regs[1] << 32) | ((uint64_t)regs[2] << 16) | (uint64_t)regs[3];
}

static int32_t s32_from_regs(const uint16_t regs[2]) {
  return (int32_t)u32_from_regs(regs);
}

bool pvdg_em500_read_grid(uint8_t slave_id, pvdg_em500_grid_t *out) {
  if (!out) return false;
  memset(out, 0, sizeof(*out));

  // Addresses are from `Modular_Yaml/meter_em500_grid.yaml`.
  // Input registers (FC04): voltages/currents/power/frequency/PF.
  // Holding registers (FC03): energy QWORD blocks (kWh).
  uint16_t r2[2];
  uint16_t r4[4];

  // Voltages
  if (pvdg_modbus_read_input_regs(slave_id, 0x0002, 2, r2) != ESP_OK) return false;
  out->l1_voltage_v = (double)u32_from_regs(r2) * 0.01;
  if (pvdg_modbus_read_input_regs(slave_id, 0x0004, 2, r2) != ESP_OK) return false;
  out->l2_voltage_v = (double)u32_from_regs(r2) * 0.01;
  if (pvdg_modbus_read_input_regs(slave_id, 0x0006, 2, r2) != ESP_OK) return false;
  out->l3_voltage_v = (double)u32_from_regs(r2) * 0.01;

  // Currents
  if (pvdg_modbus_read_input_regs(slave_id, 0x0008, 2, r2) != ESP_OK) return false;
  out->l1_current_a = (double)u32_from_regs(r2) * 0.0001;
  if (pvdg_modbus_read_input_regs(slave_id, 0x000A, 2, r2) != ESP_OK) return false;
  out->l2_current_a = (double)u32_from_regs(r2) * 0.0001;
  if (pvdg_modbus_read_input_regs(slave_id, 0x000C, 2, r2) != ESP_OK) return false;
  out->l3_current_a = (double)u32_from_regs(r2) * 0.0001;

  // Per-phase powers
  if (pvdg_modbus_read_input_regs(slave_id, 0x0014, 2, r2) != ESP_OK) return false;
  out->l1_active_power_w = (double)s32_from_regs(r2) * 0.01;
  if (pvdg_modbus_read_input_regs(slave_id, 0x0016, 2, r2) != ESP_OK) return false;
  out->l2_active_power_w = (double)s32_from_regs(r2) * 0.01;
  if (pvdg_modbus_read_input_regs(slave_id, 0x0018, 2, r2) != ESP_OK) return false;
  out->l3_active_power_w = (double)s32_from_regs(r2) * 0.01;

  if (pvdg_modbus_read_input_regs(slave_id, 0x001A, 2, r2) != ESP_OK) return false;
  out->l1_reactive_power_var = (double)s32_from_regs(r2) * 0.01;
  if (pvdg_modbus_read_input_regs(slave_id, 0x001C, 2, r2) != ESP_OK) return false;
  out->l2_reactive_power_var = (double)s32_from_regs(r2) * 0.01;
  if (pvdg_modbus_read_input_regs(slave_id, 0x001E, 2, r2) != ESP_OK) return false;
  out->l3_reactive_power_var = (double)s32_from_regs(r2) * 0.01;

  if (pvdg_modbus_read_input_regs(slave_id, 0x0020, 2, r2) != ESP_OK) return false;
  out->l1_apparent_power_va = (double)u32_from_regs(r2) * 0.01;
  if (pvdg_modbus_read_input_regs(slave_id, 0x0022, 2, r2) != ESP_OK) return false;
  out->l2_apparent_power_va = (double)u32_from_regs(r2) * 0.01;
  if (pvdg_modbus_read_input_regs(slave_id, 0x0024, 2, r2) != ESP_OK) return false;
  out->l3_apparent_power_va = (double)u32_from_regs(r2) * 0.01;

  if (pvdg_modbus_read_input_regs(slave_id, 0x0026, 2, r2) != ESP_OK) return false;
  out->l1_pf = (double)s32_from_regs(r2) * 0.0001;
  if (pvdg_modbus_read_input_regs(slave_id, 0x0028, 2, r2) != ESP_OK) return false;
  out->l2_pf = (double)s32_from_regs(r2) * 0.0001;
  if (pvdg_modbus_read_input_regs(slave_id, 0x002A, 2, r2) != ESP_OK) return false;
  out->l3_pf = (double)s32_from_regs(r2) * 0.0001;

  if (pvdg_modbus_read_input_regs(slave_id, 0x0032, 2, r2) != ESP_OK) return false;
  out->frequency_hz = (double)u32_from_regs(r2) * 0.001;

  if (pvdg_modbus_read_input_regs(slave_id, 0x0034, 2, r2) != ESP_OK) return false;
  out->eqv_voltage_v = (double)u32_from_regs(r2) * 0.01;

  if (pvdg_modbus_read_input_regs(slave_id, 0x0038, 2, r2) != ESP_OK) return false;
  out->eqv_current_a = (double)u32_from_regs(r2) * 0.0001;

  if (pvdg_modbus_read_input_regs(slave_id, 0x003A, 2, r2) != ESP_OK) return false;
  out->total_active_power_w = (double)s32_from_regs(r2) * 0.01;

  if (pvdg_modbus_read_input_regs(slave_id, 0x003C, 2, r2) != ESP_OK) return false;
  out->total_reactive_power_var = (double)s32_from_regs(r2) * 0.01;

  if (pvdg_modbus_read_input_regs(slave_id, 0x003E, 2, r2) != ESP_OK) return false;
  out->total_apparent_power_va = (double)u32_from_regs(r2) * 0.01;

  if (pvdg_modbus_read_input_regs(slave_id, 0x0040, 2, r2) != ESP_OK) return false;
  out->total_pf = (double)s32_from_regs(r2) * 0.0001;

  // Energies are 4-word blocks. YAML divides by 2^32 then * 0.01 to get kWh.
  if (pvdg_modbus_read_holding_regs(slave_id, 0x1B21, 4, r4) == ESP_OK) {
    out->import_kwh = (u64_from_regs(r4) / 4294967296.0) * 0.01;
  }
  if (pvdg_modbus_read_holding_regs(slave_id, 0x1B25, 4, r4) == ESP_OK) {
    out->export_kwh = (u64_from_regs(r4) / 4294967296.0) * 0.01;
  }
  if (pvdg_modbus_read_holding_regs(slave_id, 0x1B49, 4, r4) == ESP_OK) {
    out->import_kwh_t1 = (u64_from_regs(r4) / 4294967296.0) * 0.01;
  }
  if (pvdg_modbus_read_holding_regs(slave_id, 0x1B4D, 4, r4) == ESP_OK) {
    out->export_kwh_t1 = (u64_from_regs(r4) / 4294967296.0) * 0.01;
  }
  if (pvdg_modbus_read_holding_regs(slave_id, 0x1B5D, 4, r4) == ESP_OK) {
    out->import_kwh_t2 = (u64_from_regs(r4) / 4294967296.0) * 0.01;
  }
  if (pvdg_modbus_read_holding_regs(slave_id, 0x1B61, 4, r4) == ESP_OK) {
    out->export_kwh_t2 = (u64_from_regs(r4) / 4294967296.0) * 0.01;
  }

  out->ok = true;
  return true;
}

