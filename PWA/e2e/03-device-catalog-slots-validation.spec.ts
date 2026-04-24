import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, gotoWorkspace, loginAs } from './helpers';

test.describe('Device catalog & validation logic', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'installer');
  });

  test('Source Slots exposes WM15 and bundle warns until firmware exists', async ({ page }) => {
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Source Slots');
    const deviceSelect = page.getByTestId('slot-grid_1-device-type');
    await expect(deviceSelect).toBeVisible();
    await deviceSelect.selectOption('wm15');
    await expect(deviceSelect).toHaveValue('wm15');
    await expect(
      page
        .locator('.slot-card')
        .filter({ hasText: 'Grid Meter 1' })
        .locator('.slot-help')
        .getByText(/Carlo Gavazzi WM15/i),
    ).toBeVisible();

    await gotoTab(page, 'YAML Export');
    const yaml = page.getByTestId('yaml-preview');
    await expect(yaml).toContainText('doc_path:');
    await expect(yaml).toContainText('Carlo Gavazzi WM15');
    await expect(yaml).toContainText('slot_firmware_bundles:');
    await expect(yaml).toContainText('bundled_modular_yaml: false');

    await gotoTab(page, 'Validation');
    await expect(page.getByText(/catalogued but has no matching Modular_Yaml meter package/i)).toBeVisible();
  });

  test('inverter catalog SMA appears in slot mapping', async ({ page }) => {
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Source Slots');
    await page.getByTestId('slot-inv_1-device-type').selectOption('sma');
    await gotoTab(page, 'Validation');
    await expect(
      page.getByText(/inverter type "sma" is catalogued but only Huawei-family YAML is bundled/i),
    ).toBeVisible();
  });
});
