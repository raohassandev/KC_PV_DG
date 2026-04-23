import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, loginAs } from './helpers';

test.describe('Dashboard & Dynamic Zero Export', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'user');
  });

  test('dashboard shows demo/live pill and live metrics region', async ({ page }) => {
    await gotoTab(page, 'Dashboard');
    const pill = page.getByTestId('dashboard-connection-pill');
    await expect(pill).toBeVisible();
    await expect(
      pill.filter({ hasText: /Live data|Demo data/ }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Live Overview' })).toBeVisible();
    await expect(page.getByText(/Grid Power|kW/).first()).toBeVisible();
  });

  test('Dynamic Zero Export area loads overview with simulator', async ({ page }) => {
    await gotoTab(page, 'Dynamic Zero Export');
    await expect(page.getByText('Dynamic Zero Export').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Role-based local PWA/i })).toBeVisible();
    await gotoTab(page, 'Dynamic Zero Export');
    await page
      .locator('.feature-shell-nav')
      .getByRole('button', { name: /Overview/i })
      .click();
    await expect(page.locator('#dzx-workspace')).toBeVisible();
  });
});
