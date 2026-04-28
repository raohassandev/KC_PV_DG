#include "nvs_store.h"

#include <stdlib.h>
#include <string.h>

#include "esp_log.h"
#include "nvs.h"
#include "nvs_flash.h"

static const char *TAG = "pvdg_nvs";
static const char *NS = "pvdg";

esp_err_t pvdg_nvs_init(void) {
  esp_err_t err = nvs_flash_init();
  if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
    ESP_ERROR_CHECK(nvs_flash_erase());
    err = nvs_flash_init();
  }
  return err;
}

esp_err_t pvdg_nvs_load_wifi(pvdg_wifi_creds_t *out) {
  if (!out) return ESP_ERR_INVALID_ARG;
  memset(out, 0, sizeof(*out));

  nvs_handle_t h;
  esp_err_t err = nvs_open(NS, NVS_READONLY, &h);
  if (err != ESP_OK) return err;

  size_t ssid_len = sizeof(out->ssid);
  size_t pass_len = sizeof(out->password);

  err = nvs_get_str(h, "wifi_ssid", out->ssid, &ssid_len);
  if (err != ESP_OK) {
    nvs_close(h);
    return err;
  }
  err = nvs_get_str(h, "wifi_pass", out->password, &pass_len);
  nvs_close(h);
  return err;
}

esp_err_t pvdg_nvs_save_wifi(const pvdg_wifi_creds_t *creds) {
  if (!creds) return ESP_ERR_INVALID_ARG;
  nvs_handle_t h;
  esp_err_t err = nvs_open(NS, NVS_READWRITE, &h);
  if (err != ESP_OK) return err;
  err = nvs_set_str(h, "wifi_ssid", creds->ssid);
  if (err == ESP_OK) err = nvs_set_str(h, "wifi_pass", creds->password);
  if (err == ESP_OK) err = nvs_commit(h);
  nvs_close(h);
  return err;
}

esp_err_t pvdg_nvs_load_site_json(char **out_json) {
  if (!out_json) return ESP_ERR_INVALID_ARG;
  *out_json = NULL;
  nvs_handle_t h;
  esp_err_t err = nvs_open(NS, NVS_READONLY, &h);
  if (err != ESP_OK) return err;
  size_t len = 0;
  err = nvs_get_str(h, "site_json", NULL, &len);
  if (err != ESP_OK || len == 0) {
    nvs_close(h);
    return err;
  }
  char *buf = (char *)malloc(len);
  if (!buf) {
    nvs_close(h);
    return ESP_ERR_NO_MEM;
  }
  err = nvs_get_str(h, "site_json", buf, &len);
  nvs_close(h);
  if (err != ESP_OK) {
    free(buf);
    return err;
  }
  *out_json = buf;
  return ESP_OK;
}

esp_err_t pvdg_nvs_save_site_json(const char *json) {
  if (!json) return ESP_ERR_INVALID_ARG;
  nvs_handle_t h;
  esp_err_t err = nvs_open(NS, NVS_READWRITE, &h);
  if (err != ESP_OK) return err;
  err = nvs_set_str(h, "site_json", json);
  if (err == ESP_OK) err = nvs_commit(h);
  nvs_close(h);
  if (err != ESP_OK) {
    ESP_LOGW(TAG, "save site_json failed: %s", esp_err_to_name(err));
  }
  return err;
}

