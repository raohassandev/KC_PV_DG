#include "modbus_rtu.h"

#include <string.h>

#include "app_config.h"
#include "driver/uart.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

static const char *TAG = "pvdg_mb";

// Protects UART1 so poll_task reads and control_task writes never interleave.
static SemaphoreHandle_t s_mb_mutex = NULL;

static uint16_t crc16_modbus(const uint8_t *buf, size_t len) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < len; i++) {
    crc ^= (uint16_t)buf[i];
    for (int b = 0; b < 8; b++) {
      if (crc & 1) crc = (crc >> 1) ^ 0xA001;
      else crc >>= 1;
    }
  }
  return crc;
}

esp_err_t pvdg_modbus_init(void) {
  s_mb_mutex = xSemaphoreCreateMutex();
  if (!s_mb_mutex) return ESP_ERR_NO_MEM;

  const uart_config_t cfg = {
    .baud_rate  = PVDG_MB_BAUD,
    .data_bits  = UART_DATA_8_BITS,
    .parity     = UART_PARITY_DISABLE,
    .stop_bits  = UART_STOP_BITS_1,
    .flow_ctrl  = UART_HW_FLOWCTRL_DISABLE,
    .source_clk = UART_SCLK_DEFAULT,
  };
  ESP_ERROR_CHECK(uart_param_config(PVDG_MB_UART, &cfg));
  ESP_ERROR_CHECK(uart_set_pin(PVDG_MB_UART,
                               PVDG_MB_TX_GPIO, PVDG_MB_RX_GPIO,
                               PVDG_MB_RTS_GPIO, UART_PIN_NO_CHANGE));
  ESP_ERROR_CHECK(uart_driver_install(PVDG_MB_UART, 2048, 0, 0, NULL, 0));
  ESP_ERROR_CHECK(uart_set_mode(PVDG_MB_UART, UART_MODE_RS485_HALF_DUPLEX));
  ESP_LOGI(TAG, "Modbus RTU init uart=%d tx=%d rx=%d rts=%d baud=%d",
           (int)PVDG_MB_UART, PVDG_MB_TX_GPIO, PVDG_MB_RX_GPIO,
           PVDG_MB_RTS_GPIO, PVDG_MB_BAUD);
  return ESP_OK;
}

// ---------------------------------------------------------------------------
// Internal: read FC03/FC04
// ---------------------------------------------------------------------------

static esp_err_t read_regs_common(uint8_t slave_id, uint8_t fc,
                                   uint16_t addr, uint16_t count,
                                   uint16_t *out_regs) {
  if (!out_regs || count == 0 || count > 64) return ESP_ERR_INVALID_ARG;

  uint8_t req[8];
  req[0] = slave_id;
  req[1] = fc;
  req[2] = (uint8_t)(addr >> 8);
  req[3] = (uint8_t)(addr & 0xFF);
  req[4] = (uint8_t)(count >> 8);
  req[5] = (uint8_t)(count & 0xFF);
  uint16_t crc = crc16_modbus(req, 6);
  req[6] = (uint8_t)(crc & 0xFF);
  req[7] = (uint8_t)(crc >> 8);

  if (xSemaphoreTake(s_mb_mutex, pdMS_TO_TICKS(600)) != pdTRUE)
    return ESP_ERR_TIMEOUT;

  uart_flush_input(PVDG_MB_UART);
  int w = uart_write_bytes(PVDG_MB_UART, (const char *)req, sizeof(req));
  if (w != (int)sizeof(req)) {
    xSemaphoreGive(s_mb_mutex);
    return ESP_FAIL;
  }

  const int want = 3 + (int)(count * 2) + 2;
  uint8_t resp[3 + 128 + 2];
  int r = uart_read_bytes(PVDG_MB_UART, resp, want, pdMS_TO_TICKS(450));

  xSemaphoreGive(s_mb_mutex);

  if (r < 5)                                   return ESP_ERR_TIMEOUT;
  if (resp[0] != slave_id)                     return ESP_FAIL;
  if (resp[1] == (uint8_t)(fc | 0x80))         return ESP_FAIL;
  if (resp[1] != fc)                           return ESP_FAIL;
  if (resp[2] != (uint8_t)(count * 2))         return ESP_FAIL;
  if (r != want)                               return ESP_ERR_INVALID_SIZE;

  uint16_t got_crc  = (uint16_t)resp[r - 2] | ((uint16_t)resp[r - 1] << 8);
  uint16_t calc_crc = crc16_modbus(resp, (size_t)r - 2);
  if (got_crc != calc_crc) return ESP_ERR_INVALID_CRC;

  const uint8_t *data = &resp[3];
  for (uint16_t i = 0; i < count; i++)
    out_regs[i] = ((uint16_t)data[i * 2] << 8) | (uint16_t)data[i * 2 + 1];

  return ESP_OK;
}

esp_err_t pvdg_modbus_read_input_regs(uint8_t slave_id, uint16_t addr,
                                       uint16_t count, uint16_t *out_regs) {
  return read_regs_common(slave_id, 0x04, addr, count, out_regs);
}

esp_err_t pvdg_modbus_read_holding_regs(uint8_t slave_id, uint16_t addr,
                                         uint16_t count, uint16_t *out_regs) {
  return read_regs_common(slave_id, 0x03, addr, count, out_regs);
}

// ---------------------------------------------------------------------------
// FC06 — Write Single Holding Register
// ---------------------------------------------------------------------------

esp_err_t pvdg_modbus_write_single_reg(uint8_t slave_id, uint16_t addr, uint16_t value) {
  uint8_t req[8];
  req[0] = slave_id;
  req[1] = 0x06;
  req[2] = (uint8_t)(addr >> 8);
  req[3] = (uint8_t)(addr & 0xFF);
  req[4] = (uint8_t)(value >> 8);
  req[5] = (uint8_t)(value & 0xFF);
  uint16_t crc = crc16_modbus(req, 6);
  req[6] = (uint8_t)(crc & 0xFF);
  req[7] = (uint8_t)(crc >> 8);

  if (xSemaphoreTake(s_mb_mutex, pdMS_TO_TICKS(600)) != pdTRUE)
    return ESP_ERR_TIMEOUT;

  uart_flush_input(PVDG_MB_UART);
  if (uart_write_bytes(PVDG_MB_UART, (const char *)req, 8) != 8) {
    xSemaphoreGive(s_mb_mutex);
    return ESP_FAIL;
  }

  // FC06 response is an echo of the request (8 bytes).
  uint8_t resp[8];
  int r = uart_read_bytes(PVDG_MB_UART, resp, 8, pdMS_TO_TICKS(450));

  xSemaphoreGive(s_mb_mutex);

  if (r < 8)                           return ESP_ERR_TIMEOUT;
  if (resp[0] != slave_id)             return ESP_FAIL;
  if (resp[1] == 0x86)                 return ESP_FAIL;  // exception
  if (resp[1] != 0x06)                 return ESP_FAIL;

  uint16_t got_crc  = (uint16_t)resp[6] | ((uint16_t)resp[7] << 8);
  uint16_t calc_crc = crc16_modbus(resp, 6);
  if (got_crc != calc_crc) return ESP_ERR_INVALID_CRC;

  return ESP_OK;
}

// ---------------------------------------------------------------------------
// FC16 — Write Multiple Holding Registers
// ---------------------------------------------------------------------------

esp_err_t pvdg_modbus_write_multiple_regs(uint8_t slave_id, uint16_t addr,
                                            uint16_t count, const uint16_t *values) {
  if (!values || count == 0 || count > 64) return ESP_ERR_INVALID_ARG;

  // PDU: [slave][0x10][addr_hi][addr_lo][cnt_hi][cnt_lo][byte_cnt][data…][crc_lo][crc_hi]
  uint8_t req[9 + 128];
  req[0] = slave_id;
  req[1] = 0x10;
  req[2] = (uint8_t)(addr >> 8);
  req[3] = (uint8_t)(addr & 0xFF);
  req[4] = (uint8_t)(count >> 8);
  req[5] = (uint8_t)(count & 0xFF);
  req[6] = (uint8_t)(count * 2);
  for (uint16_t i = 0; i < count; i++) {
    req[7 + i * 2]     = (uint8_t)(values[i] >> 8);
    req[7 + i * 2 + 1] = (uint8_t)(values[i] & 0xFF);
  }
  size_t pdu_len = 7 + count * 2;
  uint16_t crc = crc16_modbus(req, pdu_len);
  req[pdu_len]     = (uint8_t)(crc & 0xFF);
  req[pdu_len + 1] = (uint8_t)(crc >> 8);
  int total = (int)(pdu_len + 2);

  if (xSemaphoreTake(s_mb_mutex, pdMS_TO_TICKS(600)) != pdTRUE)
    return ESP_ERR_TIMEOUT;

  uart_flush_input(PVDG_MB_UART);
  if (uart_write_bytes(PVDG_MB_UART, (const char *)req, total) != total) {
    xSemaphoreGive(s_mb_mutex);
    return ESP_FAIL;
  }

  // FC16 response: [slave][0x10][addr_hi][addr_lo][cnt_hi][cnt_lo][crc_lo][crc_hi]
  uint8_t resp[8];
  int r = uart_read_bytes(PVDG_MB_UART, resp, 8, pdMS_TO_TICKS(450));

  xSemaphoreGive(s_mb_mutex);

  if (r < 8)               return ESP_ERR_TIMEOUT;
  if (resp[0] != slave_id) return ESP_FAIL;
  if (resp[1] == 0x90)     return ESP_FAIL;  // exception
  if (resp[1] != 0x10)     return ESP_FAIL;

  uint16_t got_crc  = (uint16_t)resp[6] | ((uint16_t)resp[7] << 8);
  uint16_t calc_crc = crc16_modbus(resp, 6);
  if (got_crc != calc_crc) return ESP_ERR_INVALID_CRC;

  return ESP_OK;
}
