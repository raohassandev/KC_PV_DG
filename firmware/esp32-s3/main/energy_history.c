#include "energy_history.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "cJSON.h"
#include "esp_log.h"
#include "esp_spiffs.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "modbus_poll.h"

static const char *TAG = "pvdg_history";
static const char *HISTORY_BASE = "/history";
static const char *HISTORY_PATH = "/history/energy.csv";
static const size_t MAX_HISTORY_BYTES = 256 * 1024;

static bool s_history_ready;

static void trim_history_if_needed(void) {
  FILE *f = fopen(HISTORY_PATH, "rb");
  if (!f) return;
  fseek(f, 0, SEEK_END);
  long size = ftell(f);
  fclose(f);
  if (size <= (long)MAX_HISTORY_BYTES) return;

  f = fopen(HISTORY_PATH, "rb");
  if (!f) return;
  char *buf = (char *)malloc(MAX_HISTORY_BYTES);
  if (!buf) {
    fclose(f);
    return;
  }
  fseek(f, size - (long)MAX_HISTORY_BYTES, SEEK_SET);
  size_t n = fread(buf, 1, MAX_HISTORY_BYTES, f);
  fclose(f);

  char *start = memchr(buf, '\n', n);
  if (start) {
    start++;
    n -= (size_t)(start - buf);
  } else {
    start = buf;
  }

  f = fopen(HISTORY_PATH, "wb");
  if (f) {
    fwrite(start, 1, n, f);
    fclose(f);
  }
  free(buf);
}

static void history_task(void *arg) {
  (void)arg;

  while (true) {
    pvdg_live_snapshot_t snap = {0};
    if (pvdg_modbus_poll_get_snapshot(&snap) == ESP_OK) {
      FILE *f = fopen(HISTORY_PATH, "a");
      if (f) {
        int64_t now_ms = esp_timer_get_time() / 1000;
        double grid_w = snap.grid_meter.online ? snap.grid_meter.sample.total_active_power_w : 0.0;
        double solar_w = snap.inverter.online ? snap.inverter.sample.ac_power_w : 0.0;
        double limit_pct = snap.inverter.online ? snap.inverter.sample.active_power_limit_pct : 0.0;
        unsigned flags = 0;
        if (snap.grid_meter.online) flags |= 0x01;
        if (snap.inverter.online) flags |= 0x02;
        fprintf(f, "%lld,%.2f,%.2f,%.2f,%.2f,%u\n",
                (long long)now_ms, grid_w, solar_w, grid_w + solar_w, limit_pct, flags);
        fclose(f);
        trim_history_if_needed();
      }
    }

    vTaskDelay(pdMS_TO_TICKS(60000));
  }
}

esp_err_t pvdg_energy_history_init(void) {
  esp_vfs_spiffs_conf_t conf = {
    .base_path = HISTORY_BASE,
    .partition_label = "history",
    .max_files = 4,
    .format_if_mount_failed = true,
  };
  esp_err_t err = esp_vfs_spiffs_register(&conf);
  if (err == ESP_ERR_INVALID_STATE) err = ESP_OK;
  if (err != ESP_OK) return err;

  s_history_ready = true;
  size_t total = 0;
  size_t used = 0;
  if (esp_spiffs_info("history", &total, &used) == ESP_OK) {
    ESP_LOGI(TAG, "history SPIFFS mounted total=%u used=%u", (unsigned)total, (unsigned)used);
  }
  return ESP_OK;
}

esp_err_t pvdg_energy_history_start(void) {
  if (!s_history_ready) return ESP_ERR_INVALID_STATE;
  BaseType_t ok = xTaskCreate(history_task, "energy_history", 4096, NULL, 3, NULL);
  return ok == pdPASS ? ESP_OK : ESP_ERR_NO_MEM;
}

esp_err_t pvdg_energy_history_read_json(char **out_json) {
  if (!out_json) return ESP_ERR_INVALID_ARG;
  *out_json = NULL;
  if (!s_history_ready) return ESP_ERR_INVALID_STATE;

  cJSON *root = cJSON_CreateObject();
  cJSON *records = cJSON_CreateArray();
  FILE *f = fopen(HISTORY_PATH, "r");
  if (f) {
    char line[160];
    while (fgets(line, sizeof(line), f)) {
      long long ts = 0;
      double grid_w = 0.0;
      double solar_w = 0.0;
      double load_w = 0.0;
      double limit_pct = 0.0;
      unsigned flags = 0;
      if (sscanf(line, "%lld,%lf,%lf,%lf,%lf,%u", &ts, &grid_w, &solar_w, &load_w, &limit_pct, &flags) == 6) {
        cJSON *rec = cJSON_CreateObject();
        cJSON_AddNumberToObject(rec, "timestampMs", (double)ts);
        cJSON_AddNumberToObject(rec, "gridW", grid_w);
        cJSON_AddNumberToObject(rec, "solarW", solar_w);
        cJSON_AddNumberToObject(rec, "loadW", load_w);
        cJSON_AddNumberToObject(rec, "limitPct", limit_pct);
        cJSON_AddNumberToObject(rec, "flags", flags);
        cJSON_AddItemToArray(records, rec);
      }
    }
    fclose(f);
  }

  cJSON_AddItemToObject(root, "records", records);
  cJSON_AddNumberToObject(root, "intervalSec", 60);
  char *json = cJSON_PrintUnformatted(root);
  cJSON_Delete(root);
  if (!json) return ESP_ERR_NO_MEM;
  *out_json = json;
  return ESP_OK;
}

