#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"

#define PVDG_DISCOVERY_MAX_DEVICES 32
#define PVDG_DEVICE_REGISTRY_MAX_DEVICES 16

typedef struct {
  uint8_t slave_id;
  char brand[32];
  char probe[24];
  uint16_t sample_register;
} pvdg_discovered_device_t;

typedef struct {
  uint8_t start_id;
  uint8_t end_id;
  int baud_rate;
} pvdg_discovery_request_t;

typedef struct {
  pvdg_discovered_device_t devices[PVDG_DISCOVERY_MAX_DEVICES];
  uint8_t device_count;
  int64_t scan_duration_ms;
} pvdg_discovery_result_t;

typedef struct {
  bool enabled;
  uint8_t slave_id;
  uint16_t poll_interval_ms;
  char role[24];
  char brand[32];
  char protocol[8];
  char port[8];
} pvdg_device_config_t;

typedef struct {
  pvdg_device_config_t devices[PVDG_DEVICE_REGISTRY_MAX_DEVICES];
  uint8_t device_count;
  uint32_t version;
} pvdg_device_registry_t;

esp_err_t pvdg_device_discovery_scan(const pvdg_discovery_request_t *req,
                                      pvdg_discovery_result_t *out);

esp_err_t pvdg_device_registry_load(pvdg_device_registry_t *out);
esp_err_t pvdg_device_registry_save(const pvdg_device_registry_t *registry);
