#pragma once

#include <stdint.h>
#include "esp_err.h"

esp_err_t pvdg_modbus_init(void);

// Read input registers (FC04). Address is 0-based Modbus register address.
esp_err_t pvdg_modbus_read_input_regs(uint8_t slave_id, uint16_t addr, uint16_t count, uint16_t *out_regs);

// Read holding registers (FC03). Address is 0-based Modbus register address.
esp_err_t pvdg_modbus_read_holding_regs(uint8_t slave_id, uint16_t addr, uint16_t count, uint16_t *out_regs);

// Write single holding register (FC06).
esp_err_t pvdg_modbus_write_single_reg(uint8_t slave_id, uint16_t addr, uint16_t value);

// Write multiple holding registers (FC16). count must be 1–64.
esp_err_t pvdg_modbus_write_multiple_regs(uint8_t slave_id, uint16_t addr,
                                           uint16_t count, const uint16_t *values);
