import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, gotoWorkspace, loginAs } from './helpers';

test.describe('DZX page gating', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'manufacturer');
  });

  test('DZX is hidden in sync_controller and appears in dzx_virtual_meter', async ({ page }) => {
    await gotoWorkspace(page, 'Operation');

    // default site config is sync_controller, so DZX should be absent
    await expect(page.getByTestId('subnav-pills').getByRole('button', { name: 'Dynamic Zero Export' })).toHaveCount(0);

    // Switch mode to DZX in commissioning controls
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Site Setup');
    await page.getByLabel('Operating Mode').selectOption('dzx_virtual_meter');

    // Now Operation should show DZX entry
    await gotoWorkspace(page, 'Operation');
    await expect(page.getByTestId('subnav-pills').getByRole('button', { name: 'Dynamic Zero Export' })).toBeVisible();
  });
});

