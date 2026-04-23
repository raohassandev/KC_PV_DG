import { expect, test } from '@playwright/test';
import { freshApp, loginAs } from './helpers';

test.describe('App shell & accessibility', () => {
  test('loads commissioning shell with header and workspace', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'user');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('PV-DG Smart Controller')).toBeVisible();
    await expect(page.getByTestId('workspace-active')).toContainText('Dynamic Zero Export');
  });

  test('skip link targets main landmark', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'user');
    await page.getByRole('link', { name: 'Skip to main content' }).focus();
    await page.getByRole('link', { name: 'Skip to main content' }).press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });
});
