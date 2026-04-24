import { expect, test } from '@playwright/test';
import { freshApp, loginAs } from './helpers';

test.describe('App shell & accessibility', () => {
  test('loads commissioning shell with header and workspace', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'user');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('PV-DG', { exact: true })).toBeVisible();
    await expect(page.getByText('Smart Controller')).toBeVisible();
    await expect(page.getByTestId('workspace-active')).toContainText('Operation · Dashboard');
  });

  test('skip link targets main landmark', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'user');
    await page.getByRole('link', { name: 'Skip to main content' }).focus();
    await page.getByRole('link', { name: 'Skip to main content' }).press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('account menu exposes session actions', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'user');
    await page.getByTestId('account-menu-trigger').click();
    await expect(page.getByTestId('logout-button')).toBeVisible();
  });

  test('hardware summary expands metrics list', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'user');
    await expect(page.getByTestId('hardware-summary-dl')).toHaveCount(0);
    await page.getByRole('button', { name: 'Hardware summary' }).click();
    await expect(page.getByTestId('hardware-summary-dl')).toBeVisible();
  });

  test('theme switcher applies dark mode to document', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'user');
    await expect(page.getByTestId('theme-preference-select')).toBeVisible();
    await page.getByTestId('theme-preference-select').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByTestId('theme-preference-select').selectOption('light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('scheduled theme exposes local hour range controls', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'user');
    await page.getByTestId('theme-preference-select').selectOption('schedule');
    await expect(page.getByTestId('theme-schedule-row')).toBeVisible();
    await expect(page.getByTestId('theme-schedule-start')).toBeVisible();
    await expect(page.getByTestId('theme-schedule-end')).toBeVisible();
  });
});
