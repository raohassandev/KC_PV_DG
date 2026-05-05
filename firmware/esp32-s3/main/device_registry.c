#include "device_registry.h"

#include <string.h>

#include "app_config.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "modbus_rtu.h"
#include "esp_timer.h"
#include "nvs.h"

static const char *NVS_NS = "pvdg";
static const char *NVS_KEY_DEVICES = "dev_registry";

static void set_result(pvdg_discovered_device_t *dev, uint8_t slave_id,
                       const char *brand, const char *probe,
                       uint16_t sample_register) {
  memset(dev, 0, sizeof(*dev));
  dev->slave_id = slave_id;
  strlcpy(dev->brand, brand, sizeof(dev->brand));
  strlcpy(dev->probe, probe, sizeof(dev->probe));
  dev->sample_register = sample_register;
}

static bool try_em500(uint8_t slave_id, pvdg_discovered_device_t *dev) {
  uint16_t reg = 0;
  if (pvdg_modbus_read_input_regs(slave_id, 0x0032, 1, &reg) != ESP_OK) {
    return false;
  }

  // EM500 frequency is scaled by 0.01 Hz. Normal sites are roughly 45-65 Hz.
  if (reg >= 4500 && reg <= 6500) {
    set_result(dev, slave_id, "rozwell_em500", "input_0x0032", reg);
    return true;
  }

  return false;
}

static bool try_huawei(uint8_t slave_id, pvdg_discovered_device_t *dev) {
  uint16_t reg = 0;
  if (pvdg_modbus_read_input_regs(slave_id, 0x0206, 1, &reg) != ESP_OK) {
    return false;
  }

  set_result(dev, slave_id, "huawei", "input_0x0206", reg);
  return true;
}

static bool try_wm15(uint8_t slave_id, pvdg_discovered_device_t *dev) {
  uint16_t reg = 0;
  if (pvdg_modbus_read_input_regs(slave_id, 0x0006, 1, &reg) != ESP_OK) {
    return false;
  }

  // WM15 frequency is scaled by 0.01 Hz in the plan.
  if (reg >= 4500 && reg <= 6500) {
    set_result(dev, slave_id, "gavazzi_wm15", "input_0x0006", reg);
    return true;
  }

  return false;
}

static bool try_generic(uint8_t slave_id, pvdg_discovered_device_t *dev) {
  uint16_t reg = 0;
  if (pvdg_modbus_read_holding_regs(slave_id, 0x0000, 1, &reg) == ESP_OK) {
    set_result(dev, slave_id, "unknown", "holding_0x0000", reg);
    return true;
  }

  if (pvdg_modbus_read_input_regs(slave_id, 0x0000, 1, &reg) == ESP_OK) {
    set_result(dev, slave_id, "unknown", "input_0x0000", reg);
    return true;
  }

  return false;
}

esp_err_t pvdg_device_discovery_scan(const pvdg_discovery_request_t *req,
                                      pvdg_discovery_result_t *out) {
  if (!req || !out) return ESP_ERR_INVALID_ARG;

  memset(out, 0, sizeof(*out));

  uint8_t start_id = req->start_id;
  uint8_t end_id = req->end_id;
  if (start_id < 1) start_id = 1;
  if (end_id > 247) end_id = 247;
  if (end_id < start_id) return ESP_ERR_INVALID_ARG;

  int64_t start_ms = esp_timer_get_time() / 1000;

  for (uint16_t slave = start_id; slave <= end_id; slave++) {
    if (out->device_count >= PVDG_DISCOVERY_MAX_DEVICES) {
      break;
    }

    pvdg_discovered_device_t dev = {0};
    bool found = try_em500((uint8_t)slave, &dev) ||
                 try_huawei((uint8_t)slave, &dev) ||
                 try_wm15((uint8_t)slave, &dev) ||
                 try_generic((uint8_t)slave, &dev);

    if (found) {
      out->devices[out->device_count++] = dev;
    }

    vTaskDelay(pdMS_TO_TICKS(5));
  }

  int64_t end_ms = esp_timer_get_time() / 1000;
  out->scan_duration_ms = end_ms - start_ms;
  return ESP_OK;
}

esp_err_t pvdg_device_registry_load(pvdg_device_registry_t *out) {
  if (!out) return ESP_ERR_INVALID_ARG;
  memset(out, 0, sizeof(*out));

  nvs_handle_t h;
  esp_err_t err = nvs_open(NVS_NS, NVS_READONLY, &h);
  if (err != ESP_OK) return err;

  size_t len = sizeof(*out);
  err = nvs_get_blob(h, NVS_KEY_DEVICES, out, &len);
  nvs_close(h);

  if (err == ESP_ERR_NVS_NOT_FOUND) return ESP_OK;
  if (err != ESP_OK) return err;
  if (len != sizeof(*out) || out->device_count > PVDG_DEVICE_REGISTRY_MAX_DEVICES) {
    memset(out, 0, sizeof(*out));
    return ESP_ERR_INVALID_SIZE;
  }
  return ESP_OK;
}

esp_err_t pvdg_device_registry_save(const pvdg_device_registry_t *registry) {
  if (!registry || registry->device_count > PVDG_DEVICE_REGISTRY_MAX_DEVICES) {
    return ESP_ERR_INVALID_ARG;
  }

  pvdg_device_registry_t copy = *registry;
  for (uint8_t i = 0; i < copy.device_count; i++) {
    pvdg_device_config_t *dev = &copy.devices[i];
    if (dev->slave_id < 1 || dev->slave_id > 247) return ESP_ERR_INVALID_ARG;
    if (dev->poll_interval_ms == 0) dev->poll_interval_ms = 1000;
    if (dev->protocol[0] == '\0') strlcpy(dev->protocol, "rtu", sizeof(dev->protocol));
    if (dev->port[0] == '\0') strlcpy(dev->port, "uart1", sizeof(dev->port));
  }
  copy.version++;

  nvs_handle_t h;
  esp_err_t err = nvs_open(NVS_NS, NVS_READWRITE, &h);
  if (err != ESP_OK) return err;
  err = nvs_set_blob(h, NVS_KEY_DEVICES, &copy, sizeof(copy));
  if (err == ESP_OK) err = nvs_commit(h);
  nvs_close(h);
  return err;
}
