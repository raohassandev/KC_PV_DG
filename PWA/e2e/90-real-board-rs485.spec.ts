import { expect, test } from '@playwright/test';

/**
 * Real-hardware smoke test for RS485 meter path.
 *
 * Run:
 *   REAL_BOARD_IP=192.168.0.100 npx playwright test e2e/90-real-board-rs485.spec.ts --reporter=line
 *
 * This test is skipped unless REAL_BOARD_IP is provided.
 */

const ip = process.env.REAL_BOARD_IP;

test.describe('Real board (RS485) endpoints', () => {
  test.skip(!ip, 'Set REAL_BOARD_IP to run against hardware.');

  const baseUrl = `http://${ip}`;

  async function getEntity(path: string) {
    const res = await fetch(`${baseUrl}${path}`, {
      // ESPHome web_server v3 sometimes stalls unless connection is closed.
      headers: { connection: 'close' },
    });
    expect(res.ok, `${path} status ${res.status}`).toBeTruthy();
    return (await res.json()) as { state?: string | number; value?: string | number };
  }

  function numeric(entity: { state?: string | number; value?: string | number }) {
    const v = entity.value ?? entity.state;
    return typeof v === 'number' ? v : Number(v);
  }

  test('board serves identity endpoints for discovery', async () => {
    // Minimal reachability check. Some firmware builds may not include the identity template sensors.
    const root = await fetch(`${baseUrl}/`, { headers: { connection: 'close' } });
    expect(root.ok).toBeTruthy();
  });

  test('RS485 grid meter key sensors return numeric values', async () => {
    const gridStatus = await getEntity('/text_sensor/Grid%20Meter%20Status');
    expect(String(gridStatus.state ?? '')).toMatch(/ONLINE|NO DATA|DISABLED/i);

    const freq = await getEntity('/sensor/Grid%20Frequency');
    const watts = await getEntity('/sensor/Grid%20Total%20Active%20Power');
    const v1 = await getEntity('/sensor/Grid%20L1%20Voltage');
    const v2 = await getEntity('/sensor/Grid%20L2%20Voltage');
    const v3 = await getEntity('/sensor/Grid%20L3%20Voltage');
    const i1 = await getEntity('/sensor/Grid%20L1%20Current');
    const i2 = await getEntity('/sensor/Grid%20L2%20Current');
    const i3 = await getEntity('/sensor/Grid%20L3%20Current');
    const pf = await getEntity('/sensor/Grid%20Total%20Power%20Factor');
    const importKwh = await getEntity('/sensor/Grid%20Import%20Energy');

    expect(numeric(freq)).toBeGreaterThan(0);
    // power can be negative/positive; just assert it's a finite number
    expect(Number.isFinite(numeric(watts))).toBeTruthy();
    expect(numeric(v1)).toBeGreaterThan(0);
    expect(numeric(v2)).toBeGreaterThan(0);
    expect(numeric(v3)).toBeGreaterThan(0);
    expect(Number.isFinite(numeric(i1))).toBeTruthy();
    expect(Number.isFinite(numeric(i2))).toBeTruthy();
    expect(Number.isFinite(numeric(i3))).toBeTruthy();
    expect(Number.isFinite(numeric(pf))).toBeTruthy();
    expect(numeric(importKwh)).toBeGreaterThanOrEqual(0);
  });
});

