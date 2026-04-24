import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, gotoWorkspace, loginAs } from './helpers';

test.describe('Site Setup — LAN discovery (mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/board/probe**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          whoami: {
            deviceName: 'e2e-mock-controller',
            fwVersion: 'e2e-1',
            mac: 'AA:BB:CC:DD:EE:FF',
          },
        }),
      });
    });
    await page.route('**/api/board/scan**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          baseUrl: 'http://192.168.0.222',
          tried: ['192.168.0.222'],
        }),
      });
    });
  });

  test('Scan LAN applies discovered IP to Board IP', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'installer');
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Site Setup');

    const boardIpField = page.getByRole('textbox', { name: /Board IP LAN address/i });

    await expect(boardIpField).toHaveValue('192.168.0.111');

    await page.getByRole('button', { name: 'Scan LAN (quick)' }).click();

    await expect(boardIpField).toHaveValue('192.168.0.222');
    await expect(page.getByText('Device: e2e-mock-controller')).toBeVisible();
  });

  test('Site topology template replaces config after confirm', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'installer');
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Site Setup');

    await expect(
      page.getByTestId('site-template-select').locator('option', { hasText: 'LAN: TCP grid meter' }),
    ).toHaveCount(1);

    page.once('dialog', (d) => d.accept());
    await page.getByTestId('site-template-select').selectOption('builtin:topology_dual_bus_combined');
    await page.getByTestId('site-template-apply').click();
    await expect(page.getByTestId('site-template-last-applied')).toContainText('Dual bus — combined');

    await gotoTab(page, 'Validation');
    await expect(
      page.locator('.stat-card').filter({ hasText: 'Topology' }).getByText('DUAL_BUS_COMBINED'),
    ).toBeVisible();
    await expect(
      page.locator('.stat-card').filter({ hasText: 'Scenario template' }),
    ).toContainText('Dual bus — combined');

    await gotoTab(page, 'YAML Export');
    await expect(page.getByTestId('yaml-preview')).toContainText('commissioning_scenario_template_id');
    await expect(page.getByTestId('yaml-preview')).toContainText('topology_dual_bus_combined');
  });

  test('JSON site preset loads from public manifest', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'installer');
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Site Setup');

    page.once('dialog', (d) => d.accept());
    await page.getByTestId('site-template-select').selectOption('external:preset_tcp_grid_rtu_pv');
    await page.getByTestId('site-template-apply').click();

    await gotoTab(page, 'Validation');
    await expect(
      page.locator('.stat-card').filter({ hasText: 'Scenario template' }),
    ).toContainText('LAN: TCP grid meter + RTU PV');

    await gotoTab(page, 'YAML Export');
    await expect(page.getByTestId('yaml-preview')).toContainText('preset_tcp_grid_rtu_pv');
    await expect(page.getByTestId('yaml-preview')).toContainText('192.168.1.50');
  });
});
