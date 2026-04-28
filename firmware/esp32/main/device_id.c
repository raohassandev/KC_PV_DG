#include "device_id.h"

#include <string.h>

#include "app_config.h"
#include "esp_netif.h"
#include "esp_system.h"
#include "esp_wifi.h"

static void mac_to_str(const uint8_t mac[6], char out[18]) {
  // XX:XX:XX:XX:XX:XX
  snprintf(out, 18, "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

esp_err_t pvdg_device_id_get(pvdg_device_id_t *out) {
  if (!out) return ESP_ERR_INVALID_ARG;
  memset(out, 0, sizeof(*out));

  strlcpy(out->device_name, PVDG_DEVICE_NAME, sizeof(out->device_name));
  strlcpy(out->fw_version, PVDG_FW_VERSION, sizeof(out->fw_version));

  uint8_t mac[6] = {0};
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  mac_to_str(mac, out->mac);

  // Default controller_id: device_name + last 3 bytes of MAC (stable)
  snprintf(out->controller_id, sizeof(out->controller_id), "%s-%02X%02X%02X",
           PVDG_DEVICE_NAME, mac[3], mac[4], mac[5]);

  // IP is filled by wifi.c when connected; leave as empty string if unknown.
  out->ip[0] = '\0';
  return ESP_OK;
}

