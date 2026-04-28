#include "ota.h"

#include <string.h>

#include "esp_https_ota.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "pvdg_ota";

static pvdg_ota_status_t s_status;
static bool s_running = false;

static void set_status(const char *state, const char *msg) {
  strlcpy(s_status.state, state, sizeof(s_status.state));
  if (msg) strlcpy(s_status.message, msg, sizeof(s_status.message));
  else s_status.message[0] = '\0';
}

void pvdg_ota_init(void) {
  memset(&s_status, 0, sizeof(s_status));
  set_status("idle", NULL);
}

void pvdg_ota_get_status(pvdg_ota_status_t *out) {
  if (!out) return;
  *out = s_status;
}

static void ota_task(void *arg) {
  const char *url = (const char *)arg;
  ESP_LOGI(TAG, "OTA start url=%s", url);
  set_status("downloading", "starting");

  esp_http_client_config_t http_cfg = {
    .url = url,
    .timeout_ms = 15000,
    // v1: allow insecure for development; tighten in production.
    .skip_cert_common_name_check = true,
  };
  esp_https_ota_config_t ota_cfg = {
    .http_config = &http_cfg,
  };

  set_status("applying", "downloading and flashing");
  esp_err_t err = esp_https_ota(&ota_cfg);
  if (err == ESP_OK) {
    set_status("done", "rebooting");
    ESP_LOGI(TAG, "OTA success, rebooting");
    vTaskDelay(pdMS_TO_TICKS(350));
    esp_restart();
  } else {
    ESP_LOGE(TAG, "OTA failed: %s", esp_err_to_name(err));
    set_status("failed", esp_err_to_name(err));
  }

  s_running = false;
  vTaskDelete(NULL);
}

esp_err_t pvdg_ota_start(const char *url) {
  if (!url || url[0] == '\0') return ESP_ERR_INVALID_ARG;
  if (s_running) return ESP_ERR_INVALID_STATE;
  strlcpy(s_status.url, url, sizeof(s_status.url));
  s_running = true;
  BaseType_t ok = xTaskCreate(ota_task, "pvdg_ota", 8192, (void *)url, 5, NULL);
  if (ok != pdPASS) {
    s_running = false;
    set_status("failed", "task_create_failed");
    return ESP_ERR_NO_MEM;
  }
  return ESP_OK;
}

