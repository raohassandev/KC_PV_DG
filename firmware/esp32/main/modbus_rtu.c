#include "modbus_rtu.h"

#include <string.h>

#include "app_config.h"
#include "driver/uart.h"
#include "esp_log.h"

static const char *TAG = "pvdg_mb";

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
  const uart_config_t cfg = {
    .baud_rate = PVDG_MB_BAUD,
    .data_bits = UART_DATA_8_BITS,
    .parity = UART_PARITY_DISABLE,
    .stop_bits = UART_STOP_BITS_1,
    .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
    .source_clk = UART_SCLK_DEFAULT,
  };
  ESP_ERROR_CHECK(uart_param_config(PVDG_MB_UART, &cfg));
  ESP_ERROR_CHECK(uart_set_pin(PVDG_MB_UART, PVDG_MB_TX_GPIO, PVDG_MB_RX_GPIO, PVDG_MB_RTS_GPIO, UART_PIN_NO_CHANGE));
  ESP_ERROR_CHECK(uart_driver_install(PVDG_MB_UART, 2048, 0, 0, NULL, 0));
  ESP_ERROR_CHECK(uart_set_mode(PVDG_MB_UART, UART_MODE_RS485_HALF_DUPLEX));
  ESP_LOGI(TAG, "Modbus RTU init uart=%d tx=%d rx=%d rts=%d baud=%d",
           (int)PVDG_MB_UART, PVDG_MB_TX_GPIO, PVDG_MB_RX_GPIO, PVDG_MB_RTS_GPIO, PVDG_MB_BAUD);
  return ESP_OK;
}

static esp_err_t read_regs_common(uint8_t slave_id, uint8_t fc, uint16_t addr, uint16_t count, uint16_t *out_regs) {
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

  uart_flush_input(PVDG_MB_UART);
  int w = uart_write_bytes(PVDG_MB_UART, (const char *)req, sizeof(req));
  if (w != (int)sizeof(req)) return ESP_FAIL;

  const int want = 3 + (int)(count * 2) + 2;
  uint8_t resp[3 + 128 + 2];
  int r = uart_read_bytes(PVDG_MB_UART, resp, want, pdMS_TO_TICKS(450));
  if (r < 5) return ESP_ERR_TIMEOUT;
  if (resp[0] != slave_id) return ESP_FAIL;
  if (resp[1] == (uint8_t)(fc | 0x80)) return ESP_FAIL;
  if (resp[1] != fc) return ESP_FAIL;
  if (resp[2] != (uint8_t)(count * 2)) return ESP_FAIL;
  if (r != want) return ESP_ERR_INVALID_SIZE;
  uint16_t got_crc = (uint16_t)resp[r - 2] | ((uint16_t)resp[r - 1] << 8);
  uint16_t calc = crc16_modbus(resp, (size_t)r - 2);
  if (got_crc != calc) return ESP_ERR_INVALID_CRC;
  const uint8_t *data = &resp[3];
  for (uint16_t i = 0; i < count; i++) {
    out_regs[i] = ((uint16_t)data[i * 2] << 8) | (uint16_t)data[i * 2 + 1];
  }
  return ESP_OK;
}

esp_err_t pvdg_modbus_read_input_regs(uint8_t slave_id, uint16_t addr, uint16_t count, uint16_t *out_regs) {
  return read_regs_common(slave_id, 0x04, addr, count, out_regs);
}

esp_err_t pvdg_modbus_read_holding_regs(uint8_t slave_id, uint16_t addr, uint16_t count, uint16_t *out_regs) {
  return read_regs_common(slave_id, 0x03, addr, count, out_regs);
}

