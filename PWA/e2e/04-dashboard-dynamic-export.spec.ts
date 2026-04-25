import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, gotoWorkspace, loginAs } from './helpers';

test.describe('Dashboard & monitoring shell', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
  });

  test('dashboard shows demo/live pill and live metrics region', async ({ page }) => {
    await loginAs(page, 'user');
    await gotoTab(page, 'Live status');
    const pill = page.getByTestId('dashboard-connection-pill');
    await expect(pill).toBeVisible();
    await expect(pill.filter({ hasText: /Live data|Offline/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(/Grid Power|kW/).first()).toBeVisible();
  });

  test('Monitoring area loads energy analytics with simulator', async ({ page }) => {
    await loginAs(page, 'manufacturer');
    await gotoWorkspace(page, 'Operation');
    await gotoTab(page, 'Monitoring');
    await expect(page.getByText('Plant monitoring').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Live operations & reliability/i })).toBeVisible();
    await page.getByTestId('monitoring-subnav').getByRole('button', { name: /Energy History/i }).click();
    await expect(page.getByTestId('energy-analytics')).toBeVisible();
    await page.getByTestId('monitoring-subnav').getByRole('button', { name: /^Reliability$/i }).click();
    await expect(page.getByTestId('reliability-page')).toBeVisible();
    await page.getByTestId('monitoring-subnav').getByRole('button', { name: /^Diagnostics$/i }).click();
    await expect(page.getByTestId('diagnostics-page')).toBeVisible();
    await expect(page.getByRole('note')).toContainText(/Live status/i);
  });
});
