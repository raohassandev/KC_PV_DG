import { expect, test } from '@playwright/test';
import {
  e2eDashboardSlotParitySlots,
  freshApp,
  gotoTab,
  gotoWorkspace,
  loginAs,
  seedPersistedSiteConfig,
} from './helpers';

function jsonBody(obj: unknown) {
  return JSON.stringify(obj);
}

test.describe('Dashboard vs commissioning slots', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('http://192.168.0.111/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      const text = (state: string) => jsonBody({ state });
      const val = (value: string | number) => jsonBody({ value });

      // probeBoard() tries /whoami before entity endpoints; without this, probe fails and
      // auto-connect falls through to boardName.local (LAN device), bypassing this mock.
      if (path === '/whoami' || path.endsWith('/whoami')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ deviceName: 'pv-dg-e2e-mock' }),
        });
        return;
      }

      if (path.includes('/text_sensor/Controller%20State')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: text('GRID ZERO EXPORT') });
        return;
      }
      if (path.includes('/text_sensor/Grid%20Meter%20Status')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: text('ONLINE') });
        return;
      }
      if (path.includes('/sensor/Grid%20Frequency')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(50.0) });
        return;
      }
      if (path.includes('/sensor/Grid%20Total%20Active%20Power')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(2500) });
        return;
      }
      if (path.includes('/sensor/Grid%20Total%20Reactive%20Power')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(0) });
        return;
      }
      if (path.includes('/sensor/Grid%20Total%20Apparent%20Power')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(2500) });
        return;
      }
      if (path.includes('/sensor/Grid%20Import%20Energy')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(12.34) });
        return;
      }
      if (path.includes('/sensor/Grid%20Export%20Energy')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(0) });
        return;
      }
      if (path.includes('/sensor/Grid%20Import%20Energy%20Tariff%201')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(0) });
        return;
      }
      if (path.includes('/sensor/Grid%20Export%20Energy%20Tariff%201')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(0) });
        return;
      }
      if (path.includes('/sensor/Grid%20Import%20Energy%20Tariff%202')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(0) });
        return;
      }
      if (path.includes('/sensor/Grid%20Export%20Energy%20Tariff%202')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(0) });
        return;
      }
      if (path.includes('/sensor/Grid%20Total%20Power%20Factor')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(0.98) });
        return;
      }
      for (const axis of ['L1', 'L2', 'L3'] as const) {
        if (path.includes(`/sensor/Grid%20${axis}%20Voltage`)) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: val(230) });
          return;
        }
        if (path.includes(`/sensor/Grid%20${axis}%20Current`)) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: val(1.2) });
          return;
        }
        if (path.includes(`/sensor/Grid%20${axis}%20Active%20Power`)) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: val(800) });
          return;
        }
        if (path.includes(`/sensor/Grid%20${axis}%20Reactive%20Power`)) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: val(0) });
          return;
        }
        if (path.includes(`/sensor/Grid%20${axis}%20Apparent%20Power`)) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: val(800) });
          return;
        }
        if (path.includes(`/sensor/Grid%20${axis}%20Power%20Factor`)) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: val(0.98) });
          return;
        }
      }
      if (path.includes('/sensor/Grid%20Equivalent%20Phase%20Voltage')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(230) });
        return;
      }
      if (path.includes('/sensor/Grid%20Equivalent%20Current')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(1.2) });
        return;
      }

      if (path.includes('/text_sensor/Inverter%20Status')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: text('ONLINE') });
        return;
      }
      if (path.includes('/sensor/Inverter%20Actual%20Power')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(3.5) });
        return;
      }
      if (path.includes('/sensor/Inverter%20Pmax')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(10) });
        return;
      }

      if (path.includes('/text_sensor/Generator%201%20Meter%20Status')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: text('ONLINE') });
        return;
      }
      if (path.includes('/sensor/Generator%201%20Total%20Active%20Power')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(0) });
        return;
      }
      if (path.includes('/text_sensor/Generator%202%20Meter%20Status')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: text('ONLINE') });
        return;
      }
      if (path.includes('/sensor/Generator%202%20Total%20Active%20Power')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: val(0) });
        return;
      }

      for (let i = 2; i <= 5; i++) {
        if (path.includes(`/text_sensor/Inverter%20${i}%20Status`)) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: text('ONLINE') });
          return;
        }
        if (path.includes(`/sensor/Inverter%20${i}%20Actual%20Power`)) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: val(0) });
          return;
        }
        if (path.includes(`/sensor/Inverter%20${i}%20Pmax`)) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: val(10) });
          return;
        }
      }

      await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    });
  });

  test('lists all enabled slots with stable ids and ingests mocked board metrics', async ({ page }) => {
    await freshApp(page);
    await seedPersistedSiteConfig(page, {
      siteName: 'E2E parity',
      boardName: 'pv-dg-controller',
      boardIp: '192.168.0.111',
      slots: e2eDashboardSlotParitySlots,
    });
    await loginAs(page, 'installer');
    await gotoWorkspace(page, 'Operation');
    // Installer/manufacturer see "Dashboard"; owners see "Live status" (navModel.operationPageLabel).
    await gotoTab(page, 'Dashboard');

    await expect(page.getByTestId('dashboard-source-count')).toContainText('8 source entries');

    await expect(page.locator('.source-card').filter({ hasText: 'Generator Meter 1' }).getByText('ID: gen_1')).toBeVisible();
    await expect(page.locator('.source-card').filter({ hasText: 'Generator Meter 2' }).getByText('ID: gen_2')).toBeVisible();

    for (let i = 1; i <= 5; i++) {
      await expect(
        page.locator('.source-card').filter({ hasText: `Inverter ${i}` }).getByText(`ID: inv_${i}`),
      ).toBeVisible();
    }

    await expect(page.getByText('Grid-only commissioning')).toHaveCount(0);
    await expect(page.getByText(/Grid Power/i).first()).toBeVisible();
    await expect(page.getByText(/2\.50/).first()).toBeVisible();
  });
});
