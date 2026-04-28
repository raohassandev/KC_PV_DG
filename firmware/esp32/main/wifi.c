#include "wifi.h"

#include <string.h>

#include "app_config.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/task.h"
#include "lwip/inet.h"
#include "nvs_store.h"

static const char *TAG = "pvdg_wifi";

static EventGroupHandle_t s_events;
static esp_netif_t *s_netif_sta = NULL;
static esp_netif_t *s_netif_ap = NULL;
static pvdg_net_mode_t s_mode = PVDG_NET_UNKNOWN;
static char s_ip[16] = {0};

// Bits
static const int BIT_STA_GOT_IP = BIT0;
static const int BIT_STA_FAIL = BIT1;

static void on_ip_event(void *arg, esp_event_base_t base, int32_t id, void *data) {
  (void)arg;
  (void)base;
  (void)id;
  ip_event_got_ip_t *e = (ip_event_got_ip_t *)data;
  esp_ip4addr_ntoa(&e->ip_info.ip, s_ip, sizeof(s_ip));
  xEventGroupSetBits(s_events, BIT_STA_GOT_IP);
}

static void on_wifi_event(void *arg, esp_event_base_t base, int32_t id, void *data) {
  (void)arg;
  (void)base;
  (void)data;
  if (id == WIFI_EVENT_STA_DISCONNECTED) {
    // we'll let bootstrap fallback to AP if needed
  }
}

static void build_softap_ssid(char out[33]) {
  uint8_t mac[6] = {0};
  esp_read_mac(mac, ESP_MAC_WIFI_SOFTAP);
  snprintf(out, 33, "%s%02X%02X%02X", PVDG_SOFTAP_SSID_PREFIX, mac[3], mac[4], mac[5]);
}

static esp_err_t start_softap(void) {
  if (!s_netif_ap) s_netif_ap = esp_netif_create_default_wifi_ap();
  wifi_config_t cfg = {0};
  build_softap_ssid((char *)cfg.ap.ssid);
  cfg.ap.ssid_len = strlen((char *)cfg.ap.ssid);
  strlcpy((char *)cfg.ap.password, PVDG_SOFTAP_PASSWORD, sizeof(cfg.ap.password));
  cfg.ap.channel = PVDG_SOFTAP_CHANNEL;
  cfg.ap.max_connection = PVDG_SOFTAP_MAX_CONN;
  cfg.ap.authmode = WIFI_AUTH_WPA_WPA2_PSK;
  if (strlen(PVDG_SOFTAP_PASSWORD) == 0) cfg.ap.authmode = WIFI_AUTH_OPEN;
  ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));
  ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &cfg));
  ESP_ERROR_CHECK(esp_wifi_start());

  s_mode = PVDG_NET_SOFTAP;
  strlcpy(s_ip, "192.168.4.1", sizeof(s_ip));
  ESP_LOGI(TAG, "SoftAP started SSID=%s IP=%s", (char *)cfg.ap.ssid, s_ip);
  return ESP_OK;
}

static esp_err_t start_sta(const char *ssid, const char *password) {
  if (!s_netif_sta) s_netif_sta = esp_netif_create_default_wifi_sta();

  wifi_config_t cfg = {0};
  strlcpy((char *)cfg.sta.ssid, ssid, sizeof(cfg.sta.ssid));
  strlcpy((char *)cfg.sta.password, password ? password : "", sizeof(cfg.sta.password));
  cfg.sta.threshold.authmode = WIFI_AUTH_WPA2_PSK;
  cfg.sta.pmf_cfg.capable = true;
  cfg.sta.pmf_cfg.required = false;

  ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
  ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &cfg));
  ESP_ERROR_CHECK(esp_wifi_start());
  ESP_ERROR_CHECK(esp_wifi_connect());
  ESP_LOGI(TAG, "STA connect requested SSID=%s", ssid);
  return ESP_OK;
}

esp_err_t pvdg_wifi_init(void) {
  s_events = xEventGroupCreate();
  ESP_ERROR_CHECK(esp_netif_init());
  ESP_ERROR_CHECK(esp_event_loop_create_default());
  wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
  ESP_ERROR_CHECK(esp_wifi_init(&cfg));
  ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &on_ip_event, NULL));
  ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &on_wifi_event, NULL));
  return ESP_OK;
}

esp_err_t pvdg_wifi_start_bootstrap(void) {
  // Try stored STA creds first; if missing or timeout, fall back to SoftAP.
  pvdg_wifi_creds_t creds;
  esp_err_t have = pvdg_nvs_load_wifi(&creds);

  if (have == ESP_OK && creds.ssid[0] != '\0') {
    xEventGroupClearBits(s_events, BIT_STA_GOT_IP | BIT_STA_FAIL);
    ESP_ERROR_CHECK(start_sta(creds.ssid, creds.password));
    EventBits_t bits = xEventGroupWaitBits(
      s_events,
      BIT_STA_GOT_IP,
      pdFALSE,
      pdFALSE,
      pdMS_TO_TICKS(PVDG_STA_CONNECT_TIMEOUT_MS)
    );
    if (bits & BIT_STA_GOT_IP) {
      s_mode = PVDG_NET_STA_CONNECTED;
      ESP_LOGI(TAG, "STA connected IP=%s", s_ip);
      return ESP_OK;
    }
    ESP_LOGW(TAG, "STA connect timeout, falling back to SoftAP");
  } else {
    ESP_LOGI(TAG, "No stored STA creds, starting SoftAP");
  }

  return start_softap();
}

pvdg_net_mode_t pvdg_wifi_mode(void) { return s_mode; }

esp_err_t pvdg_wifi_get_ip(char out_ip[16]) {
  if (!out_ip) return ESP_ERR_INVALID_ARG;
  if (s_ip[0] == '\0') return ESP_FAIL;
  strlcpy(out_ip, s_ip, 16);
  return ESP_OK;
}

esp_err_t pvdg_wifi_request_connect(const char *ssid, const char *password) {
  if (!ssid || ssid[0] == '\0') return ESP_ERR_INVALID_ARG;
  pvdg_wifi_creds_t creds = {0};
  strlcpy(creds.ssid, ssid, sizeof(creds.ssid));
  if (password) strlcpy(creds.password, password, sizeof(creds.password));
  ESP_ERROR_CHECK(pvdg_nvs_save_wifi(&creds));

  // Start STA immediately (even if we were on SoftAP).
  xEventGroupClearBits(s_events, BIT_STA_GOT_IP | BIT_STA_FAIL);
  ESP_ERROR_CHECK(start_sta(creds.ssid, creds.password));
  // Do not block here; status is polled via /provision_status later.
  return ESP_OK;
}

