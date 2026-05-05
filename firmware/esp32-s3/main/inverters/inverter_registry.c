#include "inverter_registry.h"

#include <string.h>

#include "huawei_sun2000.h"

const pvdg_inverter_driver_t *pvdg_inverter_driver_for_brand(const char *brand_id) {
  if (!brand_id) return NULL;
  if (strcmp(brand_id, "huawei") == 0 || strcmp(brand_id, "huawei_sun2000") == 0) {
    return pvdg_huawei_sun2000_driver();
  }
  return NULL;
}
