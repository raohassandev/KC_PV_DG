#include "modbus_poll.h"

#include <string.h>

#include "device_registry.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "inverter_registry.h"
#include "nvs.h"

static const char *TAG = "pvdg_poll";

static SemaphoreHandle_t s_snapshot_mutex;
static pvdg_live_snapshot_t s_snapshot;

static bool is_grid_meter(const pvdg_device_config_t *dev) {
  return strcmp(dev->role, "grid_meter") == 0 || strstr(dev->brand, "em500") != NULL;
}

static bool is_inverter(const pvdg_device_config_t *dev) {
  return strcmp(dev->role, "inverter") == 0 ||
         strcmp(dev->brand, "huawei") == 0 ||
         strcmp(dev->brand, "huawei_sun2000") == 0;
}

static void copy_snapshot(const pvdg_live_snapshot_t *src) {
  if (xSemaphoreTake(s_snapshot_mutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    s_snapshot = *src;
    xSemaphoreGive(s_snapshot_mutex);
  }
}

static void poll_task(void *arg) {
  (void)arg;
  pvdg_live_snapshot_t local = {0};
  local.poller_running = true;

  ESP_LOGI(TAG, "poll task started");

  while (true) {
    pvdg_device_registry_t registry = {0};
    esp_err_t reg_err = pvdg_device_registry_load(&registry);
    if (reg_err != ESP_OK && reg_err != ESP_ERR_NVS_NOT_FOUND) {
      ESP_LOGW(TAG, "device registry load failed: %s", esp_err_to_name(reg_err));
    }

    local.registry_version = registry.version;
    local.cycle_count++;
    local.updated_ms = esp_timer_get_time() / 1000;
    local.grid_meter.configured = false;
    local.inverter.configured = false;

    for (uint8_t i = 0; i < registry.device_count; i++) {
      const pvdg_device_config_t *dev = &registry.devices[i];
      if (!dev->enabled) continue;

      if (!local.grid_meter.configured && is_grid_meter(dev)) {
        local.grid_meter.configured = true;
        local.grid_meter.slave_id = dev->slave_id;
        local.grid_meter.last_attempt_ms = local.updated_ms;
        pvdg_em500_grid_t grid = {0};
        if (pvdg_em500_read_grid(dev->slave_id, &grid)) {
          local.grid_meter.online = true;
          local.grid_meter.success_count++;
          local.grid_meter.last_ok_ms = local.updated_ms;
          local.grid_meter.sample = grid;
        } else {
          local.grid_meter.online = false;
          local.grid_meter.error_count++;
        }
      } else if (!local.inverter.configured && is_inverter(dev)) {
        local.inverter.configured = true;
        local.inverter.slave_id = dev->slave_id;
        strlcpy(local.inverter.brand, dev->brand, sizeof(local.inverter.brand));
        local.inverter.last_attempt_ms = local.updated_ms;
        const pvdg_inverter_driver_t *driver = pvdg_inverter_driver_for_brand(dev->brand);
        pvdg_inverter_snapshot_t inv = {0};
        esp_err_t err = driver ? driver->read_snapshot(dev->slave_id, &inv) : ESP_ERR_NOT_SUPPORTED;
        if (err == ESP_OK) {
          local.inverter.online = true;
          local.inverter.success_count++;
          local.inverter.last_ok_ms = local.updated_ms;
          local.inverter.sample = inv;
        } else {
          local.inverter.online = false;
          local.inverter.error_count++;
        }
      }
    }

    copy_snapshot(&local);
    vTaskDelay(pdMS_TO_TICKS(registry.device_count == 0 ? 2000 : 1000));
  }
}

esp_err_t pvdg_modbus_poll_start(void) {
  if (!s_snapshot_mutex) {
    s_snapshot_mutex = xSemaphoreCreateMutex();
    if (!s_snapshot_mutex) return ESP_ERR_NO_MEM;
  }

  BaseType_t ok = xTaskCreate(poll_task, "pvdg_poll", 8192, NULL, 5, NULL);
  return ok == pdPASS ? ESP_OK : ESP_ERR_NO_MEM;
}

esp_err_t pvdg_modbus_poll_get_snapshot(pvdg_live_snapshot_t *out) {
  if (!out) return ESP_ERR_INVALID_ARG;
  if (!s_snapshot_mutex) return ESP_ERR_INVALID_STATE;
  if (xSemaphoreTake(s_snapshot_mutex, pdMS_TO_TICKS(100)) != pdTRUE) return ESP_ERR_TIMEOUT;
  *out = s_snapshot;
  xSemaphoreGive(s_snapshot_mutex);
  return ESP_OK;
}
