#include "http_server.h"

#include <stdlib.h>
#include <string.h>
#include <inttypes.h>

#include "cJSON.h"
#include "app_config.h"
#include "device_id.h"
#include "device_registry.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "esp_random.h"
#include "nvs_store.h"
#include "ota.h"
#include "wifi.h"
#include "em500.h"
#include "modbus_poll.h"
#include "inverter_registry.h"
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
  if (!ok && httpd_req_get_hdr_value_str(req, "Authorization", hdr, sizeof(hdr)) == ESP_OK) {
    const char *prefix = "Bearer ";
    if (strncmp(hdr, prefix, strlen(prefix)) == 0) ok = (strcmp(hdr + strlen(prefix), tok) == 0);
  }
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
    if (j) cJSON_Delete(j);
    free(body);
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

  pvdg_live_snapshot_t snap = {0};
  bool have_snapshot = pvdg_modbus_poll_get_snapshot(&snap) == ESP_OK;
  bool have_em = have_snapshot && snap.grid_meter.online;
  pvdg_em500_grid_t em = have_em ? snap.grid_meter.sample : (pvdg_em500_grid_t){0};

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
  cJSON_AddStringToObject(out, "gridStatus",               have_em ? "ONLINE" : "OFFLINE");
  cJSON_AddBoolToObject(out, "gridConfigured",             have_snapshot && snap.grid_meter.configured);
  cJSON_AddNumberToObject(out, "gridSlaveId",              have_snapshot ? snap.grid_meter.slave_id : 0);
  cJSON_AddNumberToObject(out, "gridErrorCount",           have_snapshot ? snap.grid_meter.error_count : 0);

  // Inverter lane 1 — populated by control_task in Group 2
  bool have_inv = have_snapshot && snap.inverter.online;
  cJSON_AddStringToObject(out, "controllerState",    "ONLINE");
  cJSON_AddStringToObject(out, "inverterStatus",     have_inv ? "ONLINE" : "OFFLINE");
  cJSON_AddNumberToObject(out, "inverterActualPower", have_inv ? snap.inverter.sample.ac_power_w : 0.0);
  cJSON_AddNumberToObject(out, "inverterPmax",        0.0);
  cJSON_AddBoolToObject(out, "inverterConfigured",    have_snapshot && snap.inverter.configured);
  cJSON_AddNumberToObject(out, "inverterSlaveId",     have_snapshot ? snap.inverter.slave_id : 0);
  cJSON_AddNumberToObject(out, "inverterErrorCount",  have_snapshot ? snap.inverter.error_count : 0);
  cJSON_AddNumberToObject(out, "snapshotAgeMs",
                          have_snapshot ? (double)((esp_timer_get_time() / 1000) - snap.updated_ms) : 0.0);

  cJSON_AddStringToObject(out, "gen1Status",   "NA");
  cJSON_AddNullToObject(out,   "gen1TotalActivePowerW");

  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

static void add_inverter_snapshot_json(cJSON *obj, const pvdg_inverter_snapshot_t *inv) {
  cJSON_AddBoolToObject(obj, "online", inv->online);
  cJSON_AddNumberToObject(obj, "state_code", inv->state_code);
  cJSON_AddNumberToObject(obj, "alarm_code", inv->alarm_code);
  cJSON_AddNumberToObject(obj, "ac_power_w", inv->ac_power_w);
  cJSON_AddNumberToObject(obj, "ac_frequency_hz", inv->ac_frequency_hz);
  cJSON_AddNumberToObject(obj, "ac_voltage_l1_v", inv->ac_voltage_l1_v);
  cJSON_AddNumberToObject(obj, "ac_voltage_l2_v", inv->ac_voltage_l2_v);
  cJSON_AddNumberToObject(obj, "ac_voltage_l3_v", inv->ac_voltage_l3_v);
  cJSON_AddNumberToObject(obj, "ac_current_l1_a", inv->ac_current_l1_a);
  cJSON_AddNumberToObject(obj, "ac_current_l2_a", inv->ac_current_l2_a);
  cJSON_AddNumberToObject(obj, "ac_current_l3_a", inv->ac_current_l3_a);
  cJSON_AddNumberToObject(obj, "dc_voltage_v", inv->dc_voltage_v);
  cJSON_AddNumberToObject(obj, "dc_current_a", inv->dc_current_a);
  cJSON_AddNumberToObject(obj, "dc_power_w", inv->dc_power_w);
  cJSON_AddNumberToObject(obj, "efficiency_pct", inv->efficiency_pct);
  cJSON_AddNumberToObject(obj, "active_power_limit_pct", inv->active_power_limit_pct);
  cJSON_AddNumberToObject(obj, "daily_energy_kwh", inv->daily_energy_kwh);
  cJSON_AddNumberToObject(obj, "lifetime_energy_kwh", inv->lifetime_energy_kwh);

  cJSON *strings = cJSON_CreateArray();
  for (uint8_t i = 0; i < inv->string_count; i++) {
    const pvdg_pv_string_snapshot_t *s = &inv->strings[i];
    if (!s->valid) continue;
    cJSON *item = cJSON_CreateObject();
    cJSON_AddNumberToObject(item, "id", i + 1);
    cJSON_AddNumberToObject(item, "voltage_v", s->voltage_v);
    cJSON_AddNumberToObject(item, "current_a", s->current_a);
    cJSON_AddNumberToObject(item, "temperature_c", s->temperature_c);
    cJSON_AddItemToArray(strings, item);
  }
  cJSON_AddItemToObject(obj, "strings", strings);
}

static esp_err_t parse_optional_json_body(httpd_req_t *req, cJSON **out) {
  *out = NULL;
  if (req->content_len <= 0) return ESP_OK;

  char *body = NULL;
  size_t body_len = 0;
  esp_err_t err = read_body(req, &body, &body_len);
  if (err != ESP_OK) return err;

  cJSON *j = cJSON_Parse(body);
  free(body);
  if (!j || !cJSON_IsObject(j)) {
    if (j) cJSON_Delete(j);
    return ESP_ERR_INVALID_ARG;
  }

  *out = j;
  return ESP_OK;
}

static uint8_t json_slave_id_or_default(const cJSON *j, uint8_t default_slave) {
  const cJSON *slave = j ? cJSON_GetObjectItem(j, "slave_id") : NULL;
  if (!cJSON_IsNumber(slave)) slave = j ? cJSON_GetObjectItem(j, "slaveId") : NULL;
  if (cJSON_IsNumber(slave) && slave->valueint >= 1 && slave->valueint <= 247) {
    return (uint8_t)slave->valueint;
  }
  return default_slave;
}

static void add_registry_device_json(cJSON *arr, const pvdg_device_config_t *dev) {
  cJSON *item = cJSON_CreateObject();
  cJSON_AddBoolToObject(item, "enabled", dev->enabled);
  cJSON_AddNumberToObject(item, "slave_id", dev->slave_id);
  cJSON_AddNumberToObject(item, "poll_interval_ms", dev->poll_interval_ms);
  cJSON_AddStringToObject(item, "role", dev->role);
  cJSON_AddStringToObject(item, "brand", dev->brand);
  cJSON_AddStringToObject(item, "protocol", dev->protocol);
  cJSON_AddStringToObject(item, "port", dev->port);
  cJSON_AddItemToArray(arr, item);
}

static esp_err_t parse_registry_body(const cJSON *root, pvdg_device_registry_t *out) {
  if (!root || !out) return ESP_ERR_INVALID_ARG;
  const cJSON *devices = cJSON_GetObjectItem(root, "devices");
  if (!cJSON_IsArray(devices)) return ESP_ERR_INVALID_ARG;

  memset(out, 0, sizeof(*out));
  const int count = cJSON_GetArraySize(devices);
  if (count > PVDG_DEVICE_REGISTRY_MAX_DEVICES) return ESP_ERR_INVALID_SIZE;

  for (int i = 0; i < count; i++) {
    const cJSON *item = cJSON_GetArrayItem(devices, i);
    if (!cJSON_IsObject(item)) return ESP_ERR_INVALID_ARG;

    const cJSON *slave = cJSON_GetObjectItem(item, "slave_id");
    if (!cJSON_IsNumber(slave)) slave = cJSON_GetObjectItem(item, "slaveId");
    const cJSON *role = cJSON_GetObjectItem(item, "role");
    const cJSON *brand = cJSON_GetObjectItem(item, "brand");
    if (!cJSON_IsNumber(slave) || slave->valueint < 1 || slave->valueint > 247 ||
        !cJSON_IsString(role) || !cJSON_IsString(brand)) {
      return ESP_ERR_INVALID_ARG;
    }

    pvdg_device_config_t *dev = &out->devices[out->device_count++];
    const cJSON *enabled = cJSON_GetObjectItem(item, "enabled");
    const cJSON *poll_ms = cJSON_GetObjectItem(item, "poll_interval_ms");
    if (!cJSON_IsNumber(poll_ms)) poll_ms = cJSON_GetObjectItem(item, "pollIntervalMs");
    const cJSON *protocol = cJSON_GetObjectItem(item, "protocol");
    const cJSON *port = cJSON_GetObjectItem(item, "port");

    dev->enabled = !cJSON_IsBool(enabled) || cJSON_IsTrue(enabled);
    dev->slave_id = (uint8_t)slave->valueint;
    dev->poll_interval_ms = cJSON_IsNumber(poll_ms) ? (uint16_t)poll_ms->valueint : 1000;
    strlcpy(dev->role, role->valuestring, sizeof(dev->role));
    strlcpy(dev->brand, brand->valuestring, sizeof(dev->brand));
    strlcpy(dev->protocol, cJSON_IsString(protocol) ? protocol->valuestring : "rtu", sizeof(dev->protocol));
    strlcpy(dev->port, cJSON_IsString(port) ? port->valuestring : "uart1", sizeof(dev->port));
  }

  return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /inverter/huawei/read
// ---------------------------------------------------------------------------

static esp_err_t huawei_read_post(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;

  cJSON *body = NULL;
  if (parse_optional_json_body(req, &body) != ESP_OK) {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad json");
    return ESP_OK;
  }

  uint8_t slave_id = json_slave_id_or_default(body, 2);
  if (body) cJSON_Delete(body);

  const pvdg_inverter_driver_t *driver = pvdg_inverter_driver_for_brand("huawei");
  pvdg_inverter_snapshot_t inv = {0};
  esp_err_t err = driver->read_snapshot(slave_id, &inv);

  cJSON *out = cJSON_CreateObject();
  cJSON_AddBoolToObject(out, "ok", err == ESP_OK);
  cJSON_AddNumberToObject(out, "slave_id", slave_id);
  cJSON_AddStringToObject(out, "brand", driver->brand_id);
  if (err == ESP_OK) {
    add_inverter_snapshot_json(out, &inv);
  } else {
    cJSON_AddStringToObject(out, "error", esp_err_to_name(err));
  }

  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

// ---------------------------------------------------------------------------
// POST /inverter/huawei/limit
// ---------------------------------------------------------------------------

static esp_err_t huawei_limit_post(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;

  cJSON *body = NULL;
  if (parse_optional_json_body(req, &body) != ESP_OK || !body) {
    if (body) cJSON_Delete(body);
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "body required");
    return ESP_OK;
  }

  uint8_t slave_id = json_slave_id_or_default(body, 2);
  const cJSON *limit = cJSON_GetObjectItem(body, "limit_pct");
  if (!cJSON_IsNumber(limit)) limit = cJSON_GetObjectItem(body, "limitPct");
  if (!cJSON_IsNumber(limit)) {
    cJSON_Delete(body);
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "limit_pct required");
    return ESP_OK;
  }

  double limit_pct = limit->valuedouble;
  cJSON_Delete(body);

  const pvdg_inverter_driver_t *driver = pvdg_inverter_driver_for_brand("huawei");
  esp_err_t err = driver->write_limit_pct(slave_id, limit_pct);

  cJSON *out = cJSON_CreateObject();
  cJSON_AddBoolToObject(out, "ok", err == ESP_OK);
  cJSON_AddNumberToObject(out, "slave_id", slave_id);
  cJSON_AddStringToObject(out, "brand", driver->brand_id);
  cJSON_AddNumberToObject(out, "requested_limit_pct", limit_pct);
  if (err != ESP_OK) cJSON_AddStringToObject(out, "error", esp_err_to_name(err));

  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

// ---------------------------------------------------------------------------
// GET /control/status
// ---------------------------------------------------------------------------

static esp_err_t control_status_get(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;

  cJSON *out = cJSON_CreateObject();
  pvdg_live_snapshot_t snap = {0};
  bool have_snapshot = pvdg_modbus_poll_get_snapshot(&snap) == ESP_OK;
  cJSON_AddStringToObject(out, "policy_mode", "zero_export");
  cJSON_AddNumberToObject(out, "export_kw", 0.0);
  cJSON_AddNumberToObject(out, "target_kw", 0.0);
  cJSON_AddNumberToObject(out, "inverter_limit_pct", 100.0);
  cJSON_AddBoolToObject(out, "gen_running", false);
  cJSON_AddBoolToObject(out, "meter_online", have_snapshot && snap.grid_meter.online);
  cJSON_AddBoolToObject(out, "inverter_online", have_snapshot && snap.inverter.online);
  cJSON_AddNumberToObject(out, "cycle_count", have_snapshot ? snap.cycle_count : 0);
  cJSON_AddNumberToObject(out, "meter_errors", have_snapshot ? snap.grid_meter.error_count : 0);
  cJSON_AddNumberToObject(out, "inverter_errors", have_snapshot ? snap.inverter.error_count : 0);
  cJSON_AddStringToObject(out, "state", have_snapshot && snap.poller_running ? "polling" : "not_started");

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

  pvdg_device_registry_t registry = {0};
  if (pvdg_device_registry_load(&registry) == ESP_OK) {
    cJSON_AddNumberToObject(out, "configuredDeviceCount", registry.device_count);
    cJSON_AddNumberToObject(out, "deviceRegistryVersion", registry.version);
  }
  pvdg_live_snapshot_t snap = {0};
  if (pvdg_modbus_poll_get_snapshot(&snap) == ESP_OK) {
    cJSON_AddBoolToObject(out, "pollerRunning", snap.poller_running);
    cJSON_AddNumberToObject(out, "pollCycleCount", snap.cycle_count);
    cJSON_AddBoolToObject(out, "gridMeterOnline", snap.grid_meter.online);
    cJSON_AddBoolToObject(out, "inverterOnline", snap.inverter.online);
  }
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

// ---------------------------------------------------------------------------
// GET/PUT /device/registry
// ---------------------------------------------------------------------------

static esp_err_t device_registry_get(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;

  pvdg_device_registry_t registry = {0};
  esp_err_t err = pvdg_device_registry_load(&registry);

  cJSON *out = cJSON_CreateObject();
  cJSON_AddBoolToObject(out, "ok", err == ESP_OK);
  cJSON_AddNumberToObject(out, "version", registry.version);
  cJSON *devices = cJSON_CreateArray();
  for (uint8_t i = 0; i < registry.device_count; i++) {
    add_registry_device_json(devices, &registry.devices[i]);
  }
  cJSON_AddItemToObject(out, "devices", devices);
  if (err != ESP_OK) cJSON_AddStringToObject(out, "error", esp_err_to_name(err));

  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

static esp_err_t device_registry_put(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;

  char *body = NULL;
  size_t body_len = 0;
  if (read_body(req, &body, &body_len) != ESP_OK) {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad body");
    return ESP_OK;
  }

  cJSON *j = cJSON_Parse(body);
  free(body);
  pvdg_device_registry_t registry = {0};
  esp_err_t err = parse_registry_body(j, &registry);
  if (j) cJSON_Delete(j);
  if (err != ESP_OK) {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad device registry");
    return ESP_OK;
  }

  err = pvdg_device_registry_save(&registry);
  if (err == ESP_OK) pvdg_nvs_bump_cfg_version();

  cJSON *out = cJSON_CreateObject();
  cJSON_AddBoolToObject(out, "ok", err == ESP_OK);
  cJSON_AddNumberToObject(out, "device_count", registry.device_count);
  if (err != ESP_OK) cJSON_AddStringToObject(out, "error", esp_err_to_name(err));
  esp_err_t resp = send_json(req, out, 200);
  cJSON_Delete(out);
  return resp;
}

// ---------------------------------------------------------------------------
// POST /device/discover
// ---------------------------------------------------------------------------

static esp_err_t device_discover_post(httpd_req_t *req) {
  if (require_token(req) != ESP_OK) return ESP_OK;

  int start_id = 1;
  int end_id = 32;
  int baud_rate = PVDG_MB_BAUD;

  if (req->content_len > 0) {
    char *body = NULL;
    size_t body_len = 0;
    if (read_body(req, &body, &body_len) != ESP_OK) {
      httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad body");
      return ESP_OK;
    }

    cJSON *j = cJSON_Parse(body);
    free(body);
    if (!j || !cJSON_IsObject(j)) {
      if (j) cJSON_Delete(j);
      httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "bad json");
      return ESP_OK;
    }

    const cJSON *scan_range = cJSON_GetObjectItem(j, "scan_range");
    if (cJSON_IsArray(scan_range) && cJSON_GetArraySize(scan_range) >= 2) {
      const cJSON *first = cJSON_GetArrayItem(scan_range, 0);
      const cJSON *last = cJSON_GetArrayItem(scan_range, 1);
      if (cJSON_IsNumber(first)) start_id = first->valueint;
      if (cJSON_IsNumber(last)) end_id = last->valueint;
    }

    const cJSON *baud = cJSON_GetObjectItem(j, "baud_rate");
    if (cJSON_IsNumber(baud)) baud_rate = baud->valueint;

    cJSON_Delete(j);
  }

  if (start_id < 1) start_id = 1;
  if (end_id > 247) end_id = 247;
  if (end_id < start_id) {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "invalid scan_range");
    return ESP_OK;
  }

  pvdg_discovery_request_t scan_req = {
    .start_id = (uint8_t)start_id,
    .end_id = (uint8_t)end_id,
    .baud_rate = baud_rate,
  };
  pvdg_discovery_result_t result = {0};
  esp_err_t scan_err = pvdg_device_discovery_scan(&scan_req, &result);
  if (scan_err != ESP_OK) {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "scan failed");
    return ESP_OK;
  }

  cJSON *out = cJSON_CreateObject();
  cJSON *devices = cJSON_CreateArray();

  for (uint8_t i = 0; i < result.device_count; i++) {
    const pvdg_discovered_device_t *found = &result.devices[i];
    cJSON *dev = cJSON_CreateObject();
    cJSON_AddNumberToObject(dev, "slave_id", found->slave_id);
    cJSON_AddBoolToObject(dev, "responding", true);
    cJSON_AddStringToObject(dev, "brand", found->brand);
    cJSON_AddStringToObject(dev, "probe", found->probe);
    cJSON_AddNumberToObject(dev, "sample_register", found->sample_register);
    cJSON_AddItemToArray(devices, dev);
  }

  cJSON_AddItemToObject(out, "devices", devices);
  cJSON_AddNumberToObject(out, "scan_duration_ms", (double)result.scan_duration_ms);
  cJSON_AddNumberToObject(out, "baud_rate", baud_rate);
  cJSON_AddNumberToObject(out, "range_start", start_id);
  cJSON_AddNumberToObject(out, "range_end", end_id);

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
  REG(HTTP_GET,  "/control/status",    control_status_get);
  REG(HTTP_POST, "/inverter/huawei/read", huawei_read_post);
  REG(HTTP_POST, "/inverter/huawei/limit", huawei_limit_post);
  REG(HTTP_GET,  "/device/registry",    device_registry_get);
  REG(HTTP_PUT,  "/device/registry",    device_registry_put);
  REG(HTTP_POST, "/device/discover",    device_discover_post);
  REG(HTTP_POST, "/api/v1/device/discover", device_discover_post);
  REG(HTTP_GET,  "/diagnostics",       diagnostics_get);
  REG(HTTP_GET,  "/ota/status",        ota_status_get);
  REG(HTTP_POST, "/ota",               ota_start_post);

#undef REG

  ESP_LOGI(TAG, "HTTP server started");
  return ESP_OK;
}
