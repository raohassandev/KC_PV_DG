#pragma once

#include <stdint.h>
#include "esp_err.h"

esp_err_t pvdg_modbus_init(void);

// Read input registers (FC04). Address is 0-based Modbus register address.
esp_err_t pvdg_modbus_read_input_regs(uint8_t slave_id, uint16_t addr, uint16_t count, uint16_t *out_regs);

// Read holding registers (FC03). Address is 0-based Modbus register address.
esp_err_t pvdg_modbus_read_holding_regs(uint8_t slave_id, uint16_t addr, uint16_t count, uint16_t *out_regs);

