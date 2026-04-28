#include "app_config.h"
#include "device_id.h"
#include "esp_log.h"
#include "nvs_store.h"
#include "ota.h"
#include "modbus_rtu.h"
#include "wifi.h"
#include "http_server.h"

static const char *TAG = "pvdg_main";

void app_main(void) {
  ESP_LOGI(TAG, "PV-DG custom firmware boot");
  ESP_ERROR_CHECK(pvdg_nvs_init());
  pvdg_ota_init();
  (void)pvdg_modbus_init();
  ESP_ERROR_CHECK(pvdg_wifi_init());
  ESP_ERROR_CHECK(pvdg_wifi_start_bootstrap());
  ESP_ERROR_CHECK(pvdg_http_start());
}

