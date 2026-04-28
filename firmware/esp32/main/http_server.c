#include "http_server.h"

#include <stdlib.h>
#include <string.h>
#include <inttypes.h>

#include "cJSON.h"
#include "device_id.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "nvs_store.h"
#include "wifi.h"

static const char *TAG = "pvdg_http";

static httpd_handle_t s_server = NULL;

static esp_err_t send_json(httpd_req_t *req, cJSON *obj, int status) {
  char *body = cJSON_PrintUnformatted(obj);
  if (!body) return ESP_ERR_NO_MEM;
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_status(req, status == 200 ? "200 OK" : "500 Internal Server Error");
  esp_err_t err = httpd_resp_send(req, body, HTTPD_RESP_USE_STRLEN);
  cJSON_free(body);
  return err;
}

static esp_err_t whoami_get(httpd_req_t *req) {
  pvdg_device_id_t id;
  pvdg_device_id_get(&id);
  pvdg_wifi_get_ip(id.ip);

  cJSON *root = cJSON_CreateObject();
  cJSON_AddStringToObject(root, "deviceName", id.device_name);
  cJSON_AddStringToObject(root, "controllerId", id.controller_id);
  cJSON_AddStringToObject(root, "mac", id.mac);
  cJSON_AddStringToObject(root, "ip", id.ip[0] ? id.ip : "");
  cJSON_AddStringToObject(root, "fwVersion", id.fw_version);
  cJSON_AddStringToObject(root, "webUiUrl", "/");

  cJSON *caps = cJSON_CreateObject();
  cJSON_AddBoolToObject(caps, "customFirmware", true);
  cJSON_AddBoolToObject(caps, "provisionWifi", true);
  cJSON_AddBoolToObject(caps, "siteConfig", true);
  cJSON_AddBoolToObject(caps, "esphomeEntityEndpoints", true);
  cJSON_AddItemToObject(root, "capabilities", caps);

  esp_err_t err = send_json(req, root, 200);
  cJSON_Delete(root);
  return err;
}

static esp_err_t read_body(httpd_req_t *req, char **out, size_t *out_len) {
  *out = NULL;
  *out_len = 0;
  int len = req->content_len;
  if (len <= 0 || len > 4096) return ESP_ERR_INVALID_SIZE;
  char *buf = (char *)calloc(1, (size_t)len + 1);
  if (!buf) return ESP_ERR_NO_MEM;
  int r = httpd_req_recv(req, buf, len);
  if (r <= 0) {
    free(buf);
    return ESP_FAIL;
  }
  buf[r] = '\0';
  *out = buf;
  *out_len = (size_t)r;
  return ESP_OK;
}

// Provision job state (minimal v1)
static char s_job_id[24] = {0};
static char s_job_state[16] = "idle";  // idle|connecting|connected|failed
static char s_job_msg[96] = {0};

static void set_job(const char *state, const char *msg) {
  strlcpy(s_job_state, state, sizeof(s_job_state));
  if (msg) strlcpy(s_job_msg, msg, sizeof(s_job_msg)); else s_job_msg[0] = '\0';
}

static esp_err_t provision_wifi_post(httpd_req_t *req) {
  char *body = NULL;
  size_t body_len = 0;
  if (read_body(req, &body, &body_len) != ESP_OK) {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad body");
    return ESP_OK;
  }
  cJSON *j = cJSON_Parse(body);
  free(body);
  if (!j) {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad json");
    return ESP_OK;
  }
  const cJSON *ssid = cJSON_GetObjectItem(j, "ssid");
  const cJSON *password = cJSON_GetObjectItem(j, "password");
  if (!cJSON_IsString(ssid) || ssid->valuestring[0] == '\0') {
    cJSON_Delete(j);
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "ssid required");
    return ESP_OK;
  }

  uint32_t r = esp_random();
  snprintf(s_job_id, sizeof(s_job_id), "job-%08" PRIx32, r);
  set_job("connecting", "wifi connect requested");

  esp_err_t err = pvdg_wifi_request_connect(ssid->valuestring, cJSON_IsString(password) ? password->valuestring : "");
  if (err != ESP_OK) {
    set_job("failed", "wifi connect failed to start");
  }
  cJSON_Delete(j);

  cJSON *out = cJSON_CreateObject();
  cJSON_AddBoolToObject(out, "accepted", err == ESP_OK);
  cJSON_AddStringToObject(out, "jobId", s_job_id[0] ? s_job_id : "job-00000000");
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

static esp_err_t provision_status_get(httpd_req_t *req) {
  // Update state based on IP presence
  char ip[16] = {0};
  if (pvdg_wifi_get_ip(ip) == ESP_OK && ip[0]) {
    set_job("connected", "got IP");
  }
  cJSON *out = cJSON_CreateObject();
  cJSON_AddStringToObject(out, "jobId", s_job_id[0] ? s_job_id : "job-00000000");
  cJSON_AddStringToObject(out, "state", s_job_state);
  if (s_job_msg[0]) cJSON_AddStringToObject(out, "message", s_job_msg);
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

static esp_err_t site_config_get(httpd_req_t *req) {
  char *json = NULL;
  esp_err_t err = pvdg_nvs_load_site_json(&json);
  if (err != ESP_OK || !json) {
    // empty config: return {}
    httpd_resp_set_type(req, "application/json");
    return httpd_resp_send(req, "{}", HTTPD_RESP_USE_STRLEN);
  }
  httpd_resp_set_type(req, "application/json");
  esp_err_t resp = httpd_resp_send(req, json, HTTPD_RESP_USE_STRLEN);
  free(json);
  return resp;
}

static esp_err_t site_config_put(httpd_req_t *req) {
  char *body = NULL;
  size_t body_len = 0;
  if (read_body(req, &body, &body_len) != ESP_OK) {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad body");
    return ESP_OK;
  }
  // Basic validation: must be JSON object
  cJSON *j = cJSON_Parse(body);
  if (!j || !cJSON_IsObject(j)) {
    if (j) cJSON_Delete(j);
    free(body);
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "expected JSON object");
    return ESP_OK;
  }
  cJSON_Delete(j);
  esp_err_t err = pvdg_nvs_save_site_json(body);
  free(body);
  cJSON *out = cJSON_CreateObject();
  cJSON_AddBoolToObject(out, "ok", err == ESP_OK);
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

static esp_err_t telemetry_snapshot_get(httpd_req_t *req) {
  // v1 snapshot mirrors the PWA/mobile `fetchBoardSnapshot` shape (a flat object).
  // For now it is backed by the same stub values as entity endpoints.
  cJSON *out = cJSON_CreateObject();

  // Grid
  cJSON_AddNumberToObject(out, "gridFrequency", 50.0);
  cJSON_AddNumberToObject(out, "gridTotalActivePowerW", 0.0);
  cJSON_AddNullToObject(out, "gridTotalReactivePowerVar");
  cJSON_AddNullToObject(out, "gridTotalApparentPowerVa");
  cJSON_AddNumberToObject(out, "gridL1Voltage", 230.0);
  cJSON_AddNumberToObject(out, "gridL2Voltage", 230.0);
  cJSON_AddNumberToObject(out, "gridL3Voltage", 230.0);
  cJSON_AddNumberToObject(out, "gridL1Current", 0.0);
  cJSON_AddNumberToObject(out, "gridL2Current", 0.0);
  cJSON_AddNumberToObject(out, "gridL3Current", 0.0);
  cJSON_AddNumberToObject(out, "gridEqvVoltage", 230.0);
  cJSON_AddNumberToObject(out, "gridEqvCurrent", 0.0);
  cJSON_AddNullToObject(out, "gridL1ActivePowerW");
  cJSON_AddNullToObject(out, "gridL2ActivePowerW");
  cJSON_AddNullToObject(out, "gridL3ActivePowerW");
  cJSON_AddNullToObject(out, "gridL1ReactivePowerVar");
  cJSON_AddNullToObject(out, "gridL2ReactivePowerVar");
  cJSON_AddNullToObject(out, "gridL3ReactivePowerVar");
  cJSON_AddNullToObject(out, "gridL1ApparentPowerVa");
  cJSON_AddNullToObject(out, "gridL2ApparentPowerVa");
  cJSON_AddNullToObject(out, "gridL3ApparentPowerVa");
  cJSON_AddNullToObject(out, "gridL1Pf");
  cJSON_AddNullToObject(out, "gridL2Pf");
  cJSON_AddNullToObject(out, "gridL3Pf");
  cJSON_AddStringToObject(out, "gridStatus", "ONLINE");
  cJSON_AddNumberToObject(out, "gridImportKwh", 0.0);
  cJSON_AddNullToObject(out, "gridExportKwh");
  cJSON_AddNullToObject(out, "gridImportKwhT1");
  cJSON_AddNullToObject(out, "gridExportKwhT1");
  cJSON_AddNullToObject(out, "gridImportKwhT2");
  cJSON_AddNullToObject(out, "gridExportKwhT2");
  cJSON_AddNumberToObject(out, "gridPf", 1.0);

  // Controller + inverter lane 1
  cJSON_AddStringToObject(out, "controllerState", "ONLINE");
  cJSON_AddStringToObject(out, "inverterStatus", "ONLINE");
  cJSON_AddNumberToObject(out, "inverterActualPower", 0.0);
  cJSON_AddNumberToObject(out, "inverterPmax", 0.0);

  // Generators
  cJSON_AddStringToObject(out, "gen1Status", "NA");
  cJSON_AddNullToObject(out, "gen1TotalActivePowerW");
  cJSON_AddStringToObject(out, "gen2Status", "NA");
  cJSON_AddNullToObject(out, "gen2TotalActivePowerW");

  // Inverters 2..10 (present in schema; default missing for now)
  for (int i = 2; i <= 10; i++) {
    char key_status[20];
    char key_actual[24];
    char key_pmax[20];
    snprintf(key_status, sizeof(key_status), "inverter%dStatus", i);
    snprintf(key_actual, sizeof(key_actual), "inverter%dActualPower", i);
    snprintf(key_pmax, sizeof(key_pmax), "inverter%dPmax", i);
    cJSON_AddStringToObject(out, key_status, "NA");
    cJSON_AddNullToObject(out, key_actual);
    cJSON_AddNullToObject(out, key_pmax);
  }

  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

// ESPHome-compatible entity endpoints (minimal v1)
static esp_err_t entity_handler(httpd_req_t *req) {
  const char *uri = req->uri ? req->uri : "";
  const bool is_text = strncmp(uri, "/text_sensor/", 12) == 0;

  // Default: unknown -> return empty object for numeric sensors, NA for text sensors.
  const char *state = "NA";
  double value = 0.0;
  bool is_numeric = false;
  bool known = false;

  // Key endpoints used by mobile dashboard
  if (strcmp(uri, "/text_sensor/Controller%20State") == 0) {
    state = "ONLINE";
    known = true;
  } else if (strcmp(uri, "/text_sensor/Grid%20Meter%20Status") == 0) {
    state = "ONLINE";
    known = true;
  } else if (strcmp(uri, "/sensor/Grid%20Frequency") == 0) {
    value = 50.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/sensor/Grid%20Total%20Active%20Power") == 0) {
    value = 0.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/sensor/Grid%20Import%20Energy") == 0) {
    value = 0.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/sensor/Grid%20Total%20Power%20Factor") == 0) {
  } else if (strcmp(uri, "/sensor/Grid%20L1%20Voltage") == 0) {
    value = 230.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/sensor/Grid%20L2%20Voltage") == 0) {
    value = 230.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/sensor/Grid%20L3%20Voltage") == 0) {
    value = 230.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/sensor/Grid%20L1%20Current") == 0) {
    value = 0.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/sensor/Grid%20L2%20Current") == 0) {
    value = 0.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/sensor/Grid%20L3%20Current") == 0) {
    value = 0.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/sensor/Grid%20Equivalent%20Phase%20Voltage") == 0) {
    value = 230.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/sensor/Grid%20Equivalent%20Current") == 0) {
    value = 0.0;
    is_numeric = true;
    known = true;
  }
    value = 1.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/text_sensor/Inverter%20Status") == 0) {
    state = "ONLINE";
    known = true;
  } else if (strcmp(uri, "/sensor/Inverter%20Actual%20Power") == 0) {
    value = 0.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/sensor/Inverter%20Pmax") == 0) {
    value = 0.0;
    is_numeric = true;
    known = true;
  } else if (strcmp(uri, "/text_sensor/Generator%201%20Meter%20Status") == 0) {
    state = "NA";
    known = true;
  } else if (strcmp(uri, "/text_sensor/Generator%202%20Meter%20Status") == 0) {
    state = "NA";
    known = true;
  } else if (strcmp(uri, "/sensor/Generator%201%20Total%20Active%20Power") == 0) {
    is_numeric = true;
    value = 0.0;
    known = true;
  } else if (strcmp(uri, "/sensor/Generator%202%20Total%20Active%20Power") == 0) {
    is_numeric = true;
    value = 0.0;
    known = true;
  } else if (strncmp(uri, "/text_sensor/Inverter%20", 20) == 0 && strstr(uri, "%20Status")) {
    // Inverter 2..10 status
    state = "NA";
    known = true;
  } else if (strncmp(uri, "/sensor/Inverter%20", 16) == 0 && (strstr(uri, "%20Actual%20Power") || strstr(uri, "%20Pmax"))) {
    // Inverter 2..10 numeric metrics
    is_numeric = true;
    value = 0.0;
    known = true;
  }

  cJSON *out = cJSON_CreateObject();
  if (!known) {
    if (is_text) {
      cJSON_AddStringToObject(out, "state", "NA");
    }
    // else: keep empty object -> mobile fetchEntity returns null
  } else if (is_numeric) {
    cJSON_AddNumberToObject(out, "value", value);
  } else {
    cJSON_AddStringToObject(out, "state", state);
  }
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

esp_err_t pvdg_http_start(void) {
  httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
  cfg.stack_size = 8192;
  cfg.max_uri_handlers = 32;

  esp_err_t err = httpd_start(&s_server, &cfg);
  if (err != ESP_OK) return err;

  httpd_uri_t who = {.uri = "/whoami", .method = HTTP_GET, .handler = whoami_get, .user_ctx = NULL};
  httpd_register_uri_handler(s_server, &who);

  httpd_uri_t prov = {.uri = "/provision_wifi", .method = HTTP_POST, .handler = provision_wifi_post};
  httpd_register_uri_handler(s_server, &prov);
  httpd_uri_t provst = {.uri = "/provision_status", .method = HTTP_GET, .handler = provision_status_get};
  httpd_register_uri_handler(s_server, &provst);

  httpd_uri_t scg = {.uri = "/site/config", .method = HTTP_GET, .handler = site_config_get};
  httpd_register_uri_handler(s_server, &scg);
  httpd_uri_t scp = {.uri = "/site/config", .method = HTTP_PUT, .handler = site_config_put};
  httpd_register_uri_handler(s_server, &scp);

  httpd_uri_t snap = {.uri = "/telemetry/snapshot", .method = HTTP_GET, .handler = telemetry_snapshot_get};
  httpd_register_uri_handler(s_server, &snap);

  // Generic entity endpoints (register wildcard prefixes)
  httpd_uri_t sensor = {.uri = "/sensor/*", .method = HTTP_GET, .handler = entity_handler};
  httpd_uri_t text = {.uri = "/text_sensor/*", .method = HTTP_GET, .handler = entity_handler};
  httpd_register_uri_handler(s_server, &sensor);
  httpd_register_uri_handler(s_server, &text);

  ESP_LOGI(TAG, "HTTP server started");
  return ESP_OK;
}

