#include "http_server.h"

#include <stdlib.h>
#include <string.h>
#include <inttypes.h>

#include "cJSON.h"
#include "device_id.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "nvs_store.h"
#include "ota.h"
#include "wifi.h"
#include "em500.h"
#include "esp_heap_caps.h"
#include "esp_timer.h"

static const char *TAG = "pvdg_http";

static httpd_handle_t s_server = NULL;

static bool token_ok(httpd_req_t *req) {
  char *tok = NULL;
  if (pvdg_nvs_load_token(&tok) != ESP_OK || !tok || !tok[0]) {
    if (tok) free(tok);
    return true;  // Not paired yet — allow all.
  }
  char hdr[96] = {0};
  bool ok = false;
  if (httpd_req_get_hdr_value_str(req, "X-PVDG-Token", hdr, sizeof(hdr)) == ESP_OK)
    ok = (strcmp(hdr, tok) == 0);
  free(tok);
  return ok;
}

static esp_err_t require_token(httpd_req_t *req) {
  if (token_ok(req)) return ESP_OK;
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_status(req, "401 Unauthorized");
  return httpd_resp_send(req, "{\"error\":\"unauthorized\"}", HTTPD_RESP_USE_STRLEN);
}

static esp_err_t send_json(httpd_req_t *req, cJSON *obj, int status) {
  char *body = cJSON_PrintUnformatted(obj);
  if (!body) return ESP_ERR_NO_MEM;
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_status(req, status == 200 ? "200 OK" : "500 Internal Server Error");
  esp_err_t err = httpd_resp_send(req, body, HTTPD_RESP_USE_STRLEN);
  cJSON_free(body);
  return err;
}

// ---------------------------------------------------------------------------
// GET /whoami
// ---------------------------------------------------------------------------

static esp_err_t whoami_get(httpd_req_t *req) {
  pvdg_device_id_t id;
  pvdg_device_id_get(&id);
  pvdg_wifi_get_ip(id.ip);

  cJSON *root = cJSON_CreateObject();
  cJSON_AddStringToObject(root, "deviceName",    id.device_name);
  cJSON_AddStringToObject(root, "controllerId",  id.controller_id);
  cJSON_AddStringToObject(root, "mac",           id.mac);
  cJSON_AddStringToObject(root, "ip",            id.ip[0] ? id.ip : "");
  cJSON_AddStringToObject(root, "fwVersion",     id.fw_version);
  cJSON_AddStringToObject(root, "hwTarget",      PVDG_HW_TARGET);
  cJSON_AddStringToObject(root, "webUiUrl",      "/");

  cJSON *caps = cJSON_CreateObject();
  cJSON_AddBoolToObject(caps, "customFirmware",    true);
  cJSON_AddBoolToObject(caps, "provisionWifi",     true);
  cJSON_AddBoolToObject(caps, "siteConfig",        true);
  cJSON_AddBoolToObject(caps, "pairing",           true);
  cJSON_AddBoolToObject(caps, "telemetrySnapshot", true);
  cJSON_AddBoolToObject(caps, "otaPull",           true);
  cJSON_AddBoolToObject(caps, "zeroExport",        true);
  cJSON_AddItemToObject(root, "capabilities", caps);

  char *tok = NULL;
  bool paired = (pvdg_nvs_load_token(&tok) == ESP_OK && tok && tok[0]);
  if (tok) free(tok);
  cJSON_AddBoolToObject(root, "paired", paired);

  esp_err_t err = send_json(req, root, 200);
  cJSON_Delete(root);
  return err;
}

// ---------------------------------------------------------------------------
// POST /pair
// ---------------------------------------------------------------------------

static void rand_hex(char *out, size_t out_len) {
  uint8_t b[16];
  for (int i = 0; i < 16; i++) b[i] = (uint8_t)(esp_random() & 0xff);
  const char *hex = "0123456789abcdef";
  size_t n = out_len - 1, j = 0;
  for (int i = 0; i < 16 && j + 1 < n; i++) {
    out[j++] = hex[(b[i] >> 4) & 0xF];
    out[j++] = hex[b[i] & 0xF];
  }
  out[j] = '\0';
}

static esp_err_t pair_post(httpd_req_t *req) {
  char *tok = NULL;
  if (pvdg_nvs_load_token(&tok) == ESP_OK && tok && tok[0]) {
    free(tok);
    httpd_resp_set_status(req, "409 Conflict");
    httpd_resp_set_type(req, "application/json");
    return httpd_resp_send(req, "{\"error\":\"already_paired\"}", HTTPD_RESP_USE_STRLEN);
  }
  if (tok) free(tok);
  char new_tok[48] = {0};
  rand_hex(new_tok, sizeof(new_tok));
  esp_err_t err = pvdg_nvs_save_token(new_tok);
  cJSON *out = cJSON_CreateObject();
  cJSON_AddBoolToObject(out, "ok", err == ESP_OK);
  cJSON_AddStringToObject(out, "token", new_tok);
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

// ---------------------------------------------------------------------------
// Body reader helper
// ---------------------------------------------------------------------------

static esp_err_t read_body(httpd_req_t *req, char **out, size_t *out_len) {
  *out = NULL; *out_len = 0;
  int len = req->content_len;
  if (len <= 0 || len > 4096) return ESP_ERR_INVALID_SIZE;
  char *buf = (char *)calloc(1, (size_t)len + 1);
  if (!buf) return ESP_ERR_NO_MEM;
  int r = httpd_req_recv(req, buf, len);
  if (r <= 0) { free(buf); return ESP_FAIL; }
  buf[r] = '\0';
  *out = buf; *out_len = (size_t)r;
  return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /provision_wifi  /  GET /provision_status
// ---------------------------------------------------------------------------

static char s_job_id[24]    = {0};
static char s_job_state[16] = "idle";
static char s_job_msg[96]   = {0};

static void set_job(const char *state, const char *msg) {
  strlcpy(s_job_state, state, sizeof(s_job_state));
  if (msg) strlcpy(s_job_msg, msg, sizeof(s_job_msg)); else s_job_msg[0] = '\0';
}

static esp_err_t provision_wifi_post(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;
  char *body = NULL; size_t body_len = 0;
  if (read_body(req, &body, &body_len) != ESP_OK) {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad body"); return ESP_OK;
  }
  cJSON *j = cJSON_Parse(body); free(body);
  if (!j) { httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad json"); return ESP_OK; }
  const cJSON *ssid     = cJSON_GetObjectItem(j, "ssid");
  const cJSON *password = cJSON_GetObjectItem(j, "password");
  if (!cJSON_IsString(ssid) || ssid->valuestring[0] == '\0') {
    cJSON_Delete(j);
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "ssid required"); return ESP_OK;
  }
  uint32_t r = esp_random();
  snprintf(s_job_id, sizeof(s_job_id), "job-%08" PRIx32, r);
  set_job("connecting", "wifi connect requested");
  esp_err_t err = pvdg_wifi_request_connect(ssid->valuestring,
                    cJSON_IsString(password) ? password->valuestring : "");
  if (err != ESP_OK) set_job("failed", "wifi connect failed to start");
  cJSON_Delete(j);
  cJSON *out = cJSON_CreateObject();
  cJSON_AddBoolToObject(out, "accepted", err == ESP_OK);
  cJSON_AddStringToObject(out, "jobId", s_job_id[0] ? s_job_id : "job-00000000");
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

static esp_err_t provision_status_get(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;
  char ip[16] = {0};
  if (pvdg_wifi_get_ip(ip) == ESP_OK && ip[0]) set_job("connected", "got IP");
  cJSON *out = cJSON_CreateObject();
  cJSON_AddStringToObject(out, "jobId",   s_job_id[0] ? s_job_id : "job-00000000");
  cJSON_AddStringToObject(out, "state",   s_job_state);
  if (s_job_msg[0]) cJSON_AddStringToObject(out, "message", s_job_msg);
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

// ---------------------------------------------------------------------------
// GET /site/config  /  PUT /site/config
// ---------------------------------------------------------------------------

static esp_err_t site_config_get(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;
  char *json = NULL;
  esp_err_t err = pvdg_nvs_load_site_json(&json);
  if (err != ESP_OK || !json) {
    httpd_resp_set_type(req, "application/json");
    return httpd_resp_send(req, "{}", HTTPD_RESP_USE_STRLEN);
  }
  httpd_resp_set_type(req, "application/json");
  esp_err_t resp = httpd_resp_send(req, json, HTTPD_RESP_USE_STRLEN);
  free(json);
  return resp;
}

static esp_err_t site_config_put(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;
  char *body = NULL; size_t body_len = 0;
  if (read_body(req, &body, &body_len) != ESP_OK) {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad body"); return ESP_OK;
  }
  cJSON *j = cJSON_Parse(body);
  if (!j || !cJSON_IsObject(j)) {
    if (j) cJSON_Delete(j); free(body);
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "expected JSON object"); return ESP_OK;
  }
  cJSON_Delete(j);
  esp_err_t err = pvdg_nvs_save_site_json(body);
  free(body);
  if (err == ESP_OK) pvdg_nvs_bump_cfg_version();  // trigger hot-reload in control_task
  cJSON *out = cJSON_CreateObject();
  cJSON_AddBoolToObject(out, "ok", err == ESP_OK);
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

// ---------------------------------------------------------------------------
// GET /telemetry/snapshot
// ---------------------------------------------------------------------------

static esp_err_t telemetry_snapshot_get(httpd_req_t *req) {
  cJSON *out = cJSON_CreateObject();

  pvdg_em500_grid_t em = {0};
  uint8_t grid_slave = 1;
  char *site_json = NULL;
  if (pvdg_nvs_load_site_json(&site_json) == ESP_OK && site_json) {
    cJSON *root = cJSON_Parse(site_json);
    if (root && cJSON_IsObject(root)) {
      const cJSON *slots = cJSON_GetObjectItem(root, "slots");
      if (cJSON_IsArray(slots)) {
        const cJSON *slot = NULL;
        cJSON_ArrayForEach(slot, slots) {
          const cJSON *enabled = cJSON_GetObjectItem(slot, "enabled");
          const cJSON *role    = cJSON_GetObjectItem(slot, "role");
          const cJSON *dev     = cJSON_GetObjectItem(slot, "deviceType");
          const cJSON *mb      = cJSON_GetObjectItem(slot, "modbusId");
          if (!cJSON_IsBool(enabled) || !cJSON_IsString(role) ||
              !cJSON_IsString(dev)   || !cJSON_IsNumber(mb)) continue;
          if (!cJSON_IsTrue(enabled)) continue;
          if (strcmp(role->valuestring, "grid_meter") != 0) continue;
          if (strncmp(dev->valuestring, "em500", 5) != 0) continue;
          int mbid = mb->valueint;
          if (mbid >= 1 && mbid <= 247) { grid_slave = (uint8_t)mbid; break; }
        }
      }
    }
    if (root) cJSON_Delete(root);
    free(site_json);
  }

  bool have_em = pvdg_em500_read_grid(grid_slave, &em);

  cJSON_AddNumberToObject(out, "gridFrequency",            have_em ? em.frequency_hz          : 50.0);
  cJSON_AddNumberToObject(out, "gridTotalActivePowerW",    have_em ? em.total_active_power_w   : 0.0);
  cJSON_AddNumberToObject(out, "gridTotalReactivePowerVar",have_em ? em.total_reactive_power_var: 0.0);
  cJSON_AddNumberToObject(out, "gridTotalApparentPowerVa", have_em ? em.total_apparent_power_va : 0.0);
  cJSON_AddNumberToObject(out, "gridL1Voltage",            have_em ? em.l1_voltage_v           : 230.0);
  cJSON_AddNumberToObject(out, "gridL2Voltage",            have_em ? em.l2_voltage_v           : 230.0);
  cJSON_AddNumberToObject(out, "gridL3Voltage",            have_em ? em.l3_voltage_v           : 230.0);
  cJSON_AddNumberToObject(out, "gridL1Current",            have_em ? em.l1_current_a           : 0.0);
  cJSON_AddNumberToObject(out, "gridL2Current",            have_em ? em.l2_current_a           : 0.0);
  cJSON_AddNumberToObject(out, "gridL3Current",            have_em ? em.l3_current_a           : 0.0);
  cJSON_AddNumberToObject(out, "gridEqvVoltage",           have_em ? em.eqv_voltage_v          : 230.0);
  cJSON_AddNumberToObject(out, "gridEqvCurrent",           have_em ? em.eqv_current_a          : 0.0);
  cJSON_AddNumberToObject(out, "gridL1ActivePowerW",       have_em ? em.l1_active_power_w      : 0.0);
  cJSON_AddNumberToObject(out, "gridL2ActivePowerW",       have_em ? em.l2_active_power_w      : 0.0);
  cJSON_AddNumberToObject(out, "gridL3ActivePowerW",       have_em ? em.l3_active_power_w      : 0.0);
  cJSON_AddNumberToObject(out, "gridPf",                   have_em ? em.total_pf               : 1.0);
  cJSON_AddNumberToObject(out, "gridImportKwh",            have_em ? em.import_kwh             : 0.0);
  cJSON_AddNumberToObject(out, "gridExportKwh",            have_em ? em.export_kwh             : 0.0);
  cJSON_AddStringToObject(out, "gridStatus",               "ONLINE");

  // Inverter lane 1 — populated by control_task in Group 2
  cJSON_AddStringToObject(out, "controllerState",    "ONLINE");
  cJSON_AddStringToObject(out, "inverterStatus",     "ONLINE");
  cJSON_AddNumberToObject(out, "inverterActualPower", 0.0);
  cJSON_AddNumberToObject(out, "inverterPmax",        0.0);

  cJSON_AddStringToObject(out, "gen1Status",   "NA");
  cJSON_AddNullToObject(out,   "gen1TotalActivePowerW");

  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

// ---------------------------------------------------------------------------
// GET /diagnostics
// ---------------------------------------------------------------------------

static esp_err_t diagnostics_get(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;
  cJSON *out = cJSON_CreateObject();
  cJSON_AddNumberToObject(out, "uptimeMs",    (double)(esp_timer_get_time() / 1000));
  cJSON_AddNumberToObject(out, "heapFree",    (double)heap_caps_get_free_size(MALLOC_CAP_8BIT));
  cJSON_AddNumberToObject(out, "heapMinFree", (double)heap_caps_get_minimum_free_size(MALLOC_CAP_8BIT));
  char ip[16] = {0};
  if (pvdg_wifi_get_ip(ip) == ESP_OK) cJSON_AddStringToObject(out, "ip", ip);
  pvdg_net_mode_t mode = pvdg_wifi_mode();
  cJSON_AddStringToObject(out, "netMode",
    mode == PVDG_NET_STA_CONNECTED ? "sta" : (mode == PVDG_NET_SOFTAP ? "softap" : "unknown"));
  int rssi = 0;
  if (pvdg_wifi_get_rssi(&rssi) == ESP_OK) cJSON_AddNumberToObject(out, "wifiRssiDbm", rssi);
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

// ---------------------------------------------------------------------------
// GET /ota/status  /  POST /ota
// ---------------------------------------------------------------------------

static esp_err_t ota_status_get(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;
  pvdg_ota_status_t st;
  pvdg_ota_get_status(&st);
  cJSON *out = cJSON_CreateObject();
  cJSON_AddStringToObject(out, "state",   st.state);
  cJSON_AddStringToObject(out, "url",     st.url[0] ? st.url : "");
  if (st.message[0]) cJSON_AddStringToObject(out, "message", st.message);
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

static esp_err_t ota_start_post(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;
  char *body = NULL; size_t body_len = 0;
  if (read_body(req, &body, &body_len) != ESP_OK) {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad body"); return ESP_OK;
  }
  cJSON *j = cJSON_Parse(body); free(body);
  if (!j || !cJSON_IsObject(j)) {
    if (j) cJSON_Delete(j);
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad json"); return ESP_OK;
  }
  const cJSON *url = cJSON_GetObjectItem(j, "url");
  if (!cJSON_IsString(url) || !url->valuestring[0]) {
    cJSON_Delete(j);
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "url required"); return ESP_OK;
  }
  esp_err_t err = pvdg_ota_start(url->valuestring);
  cJSON_Delete(j);
  cJSON *out = cJSON_CreateObject();
  cJSON_AddBoolToObject(out, "ok", err == ESP_OK);
  if (err != ESP_OK) cJSON_AddStringToObject(out, "error", esp_err_to_name(err));
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

// ---------------------------------------------------------------------------
// Server start
// ---------------------------------------------------------------------------

esp_err_t pvdg_http_start(void) {
  httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
  cfg.stack_size        = 8192;
  cfg.max_uri_handlers  = 32;

  esp_err_t err = httpd_start(&s_server, &cfg);
  if (err != ESP_OK) return err;

#define REG(m, u, h)  do { \
  httpd_uri_t _u = {.uri=u, .method=m, .handler=h, .user_ctx=NULL}; \
  httpd_register_uri_handler(s_server, &_u); \
} while(0)

  REG(HTTP_GET,  "/whoami",            whoami_get);
  REG(HTTP_POST, "/pair",              pair_post);
  REG(HTTP_POST, "/provision_wifi",    provision_wifi_post);
  REG(HTTP_GET,  "/provision_status",  provision_status_get);
  REG(HTTP_GET,  "/site/config",       site_config_get);
  REG(HTTP_PUT,  "/site/config",       site_config_put);
  REG(HTTP_GET,  "/telemetry/snapshot",telemetry_snapshot_get);
  REG(HTTP_GET,  "/diagnostics",       diagnostics_get);
  REG(HTTP_GET,  "/ota/status",        ota_status_get);
  REG(HTTP_POST, "/ota",               ota_start_post);

#undef REG

  ESP_LOGI(TAG, "HTTP server started");
  return ESP_OK;
}
