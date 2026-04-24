import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, gotoWorkspace, loginAs } from './helpers';

test.describe('Templates, engineer, YAML export', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'manufacturer');
  });

  test('templates tab documents analyzers and inverters', async ({ page }) => {
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Templates');
    await expect(
      page.getByRole('heading', { name: 'Site commissioning templates (topologies)' }),
    ).toBeVisible();
    await expect(page.getByText('Single bus — PCC')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Energy analyzers (catalog)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inverters (catalog)' })).toBeVisible();
    await expect(page.getByText(/docs\/Energy Analyzer/i)).toBeVisible();
    await expect(page.getByText(/docs\/Inverter/i)).toBeVisible();
  });

  test('engineer actions panel renders apply controls', async ({ page }) => {
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Engineer Actions');
    await expect(page.getByRole('button', { name: /Apply Toggle Settings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Apply Numeric Settings/i })).toBeVisible();
  });

  test('YAML preview shows site.config (catalog, firmware flags, controller)', async ({
    page,
  }) => {
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'YAML Export');
    const yaml = page.getByTestId('yaml-preview');
    await expect(yaml).toContainText('device_catalog:');
    await expect(yaml).toContainText('slot_firmware_bundles:');
    await expect(yaml).toContainText('controller:');
  });
});
