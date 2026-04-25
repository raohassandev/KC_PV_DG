import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, gotoWorkspace, loginAs } from './helpers';

test.describe('Dashboard & monitoring shell', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
  });

  test('dashboard shows demo/live pill and live metrics region', async ({ page }) => {
    await loginAs(page, 'user');
    await gotoTab(page, 'Dashboard');
    const pill = page.getByTestId('dashboard-connection-pill');
    await expect(pill).toBeVisible();
    await expect(pill.filter({ hasText: /Live data|Offline/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Live Overview' })).toBeVisible();
    await expect(page.getByText(/Grid Power|kW/).first()).toBeVisible();
  });

  test('Monitoring area loads overview with simulator', async ({ page }) => {
    await loginAs(page, 'manufacturer');
    await gotoWorkspace(page, 'Operation');
    await gotoTab(page, 'Monitoring');
    await expect(page.getByText('Plant monitoring').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Live operations & alerts/i })).toBeVisible();
    await page.getByTestId('monitoring-subnav').getByRole('button', { name: /Overview/i }).click();
    await expect(page.locator('#dzx-workspace')).toBeVisible();
  });
});
