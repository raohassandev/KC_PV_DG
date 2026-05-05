#include "huawei_sun2000.h"

#include <math.h>
#include <string.h>

#include "modbus_rtu.h"

#define HUAWEI_REG_STATE            0x0089
#define HUAWEI_REG_ALARM            0x008C
#define HUAWEI_REG_AC_BASE          0x0202
#define HUAWEI_REG_DAILY_ENERGY     0x0262
#define HUAWEI_REG_LIFETIME_ENERGY  0x0263
#define HUAWEI_REG_STRING_BASE      0x3200
#define HUAWEI_REG_STRING_STEP      0x0010
#define HUAWEI_REG_LIMIT_PCT        0x4640

static double u16_scale(uint16_t raw, double scale) {
  return (double)raw * scale;
}

static double s16_scale(uint16_t raw, double scale) {
  return (double)((int16_t)raw) * scale;
}

static double clamp_pct(double limit_pct) {
  if (isnan(limit_pct)) return 0.0;
  if (limit_pct < 0.0) return 0.0;
  if (limit_pct > 100.0) return 100.0;
  return limit_pct;
}

static esp_err_t read_strings(uint8_t slave_id, pvdg_inverter_snapshot_t *out) {
  out->string_count = 0;

  for (uint8_t i = 0; i < PVDG_INVERTER_MAX_STRINGS; i++) {
    uint16_t regs[3] = {0};
    uint16_t addr = HUAWEI_REG_STRING_BASE + (uint16_t)(i * HUAWEI_REG_STRING_STEP);
    esp_err_t err = pvdg_modbus_read_input_regs(slave_id, addr, 3, regs);
    if (err != ESP_OK) {
      if (i == 0) return ESP_OK;
      break;
    }

    pvdg_pv_string_snapshot_t *s = &out->strings[i];
    s->voltage_v = u16_scale(regs[0], 0.1);
    s->current_a = u16_scale(regs[1], 0.01);
    s->temperature_c = s16_scale(regs[2], 0.1);
    s->valid = true;
    out->string_count = i + 1;
  }

  return ESP_OK;
}

esp_err_t pvdg_huawei_sun2000_read(uint8_t slave_id, pvdg_inverter_snapshot_t *out) {
  if (!out) return ESP_ERR_INVALID_ARG;
  memset(out, 0, sizeof(*out));

  uint16_t state = 0;
  esp_err_t state_err = pvdg_modbus_read_input_regs(slave_id, HUAWEI_REG_STATE, 1, &state);
  if (state_err != ESP_OK) return state_err;
  out->state_code = state;

  uint16_t alarm = 0;
  if (pvdg_modbus_read_input_regs(slave_id, HUAWEI_REG_ALARM, 1, &alarm) == ESP_OK) {
    out->alarm_code = alarm;
  }

  uint16_t ac[17] = {0};
  esp_err_t err = pvdg_modbus_read_input_regs(slave_id, HUAWEI_REG_AC_BASE, 17, ac);
  if (err != ESP_OK) return err;

  out->online = true;
  out->ac_voltage_l1_v = u16_scale(ac[0], 0.1);
  out->ac_voltage_l2_v = u16_scale(ac[1], 0.1);
  out->ac_voltage_l3_v = u16_scale(ac[2], 0.1);
  out->ac_current_l1_a = u16_scale(ac[3], 0.01);
  out->ac_current_l2_a = u16_scale(ac[4], 0.01);
  out->ac_current_l3_a = u16_scale(ac[5], 0.01);
  out->ac_frequency_hz = u16_scale(ac[6], 0.01);
  out->ac_power_w = s16_scale(ac[7], 1.0);
  out->reactive_power_var = s16_scale(ac[8], 1.0);
  out->apparent_power_va = u16_scale(ac[9], 1.0);
  out->power_factor = s16_scale(ac[10], 0.001);
  out->efficiency_pct = u16_scale(ac[11], 0.01);
  out->dc_voltage_v = u16_scale(ac[12], 0.1);
  out->dc_current_a = u16_scale(ac[13], 0.01);
  out->dc_power_w = u16_scale(ac[14], 1.0);

  uint16_t energy[2] = {0};
  if (pvdg_modbus_read_input_regs(slave_id, HUAWEI_REG_DAILY_ENERGY, 2, energy) == ESP_OK) {
    out->daily_energy_kwh = u16_scale(energy[0], 0.01);
    out->lifetime_energy_kwh = u16_scale(energy[1], 0.1);
  }

  uint16_t limit = 0;
  if (pvdg_modbus_read_holding_regs(slave_id, HUAWEI_REG_LIMIT_PCT, 1, &limit) == ESP_OK) {
    out->active_power_limit_pct = u16_scale(limit, 1.0);
  }

  (void)read_strings(slave_id, out);
  return ESP_OK;
}

esp_err_t pvdg_huawei_sun2000_write_limit_pct(uint8_t slave_id, double limit_pct) {
  double clamped = clamp_pct(limit_pct);
  uint16_t reg_value = (uint16_t)lround(clamped);
  return pvdg_modbus_write_single_reg(slave_id, HUAWEI_REG_LIMIT_PCT, reg_value);
}

static const pvdg_inverter_driver_t HUAWEI_DRIVER = {
  .brand_id = "huawei",
  .display_name = "Huawei SUN2000",
  .max_rated_w = 0,
  .read_snapshot = pvdg_huawei_sun2000_read,
  .write_limit_pct = pvdg_huawei_sun2000_write_limit_pct,
};

const pvdg_inverter_driver_t *pvdg_huawei_sun2000_driver(void) {
  return &HUAWEI_DRIVER;
}
