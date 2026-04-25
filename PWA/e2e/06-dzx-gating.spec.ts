import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, gotoWorkspace, loginAs } from './helpers';

test.describe('Monitoring shell vs controller mode', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'manufacturer');
  });

  test('Monitoring tab is visible in sync_controller; DZX commissioning sub-tab only in virtual meter mode', async ({
    page,
  }) => {
    await gotoWorkspace(page, 'Operation');

    await expect(page.getByTestId('subnav-pills').getByRole('button', { name: 'Monitoring' })).toBeVisible();

    await gotoTab(page, 'Monitoring');
    await expect(page.getByTestId('monitoring-subnav').getByRole('button', { name: 'Commissioning' })).toHaveCount(
      0,
    );

    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Site Setup');
    await page.getByLabel('Operating Mode').selectOption('dzx_virtual_meter');

    await gotoWorkspace(page, 'Operation');
    await gotoTab(page, 'Monitoring');
    await expect(page.getByTestId('monitoring-subnav').getByRole('button', { name: 'Commissioning' })).toBeVisible();
  });
});
