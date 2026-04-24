import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, gotoWorkspace, loginAs } from './helpers';

const savedTitle = 'Gateway E2E Site Title';
const fleetSiteId = 'e2e_gateway_sync_site';

test.describe('Gateway commissioning sync', () => {
  test('saves and reloads SiteConfig via VPS gateway', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'manufacturer', { siteId: fleetSiteId });
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Site Setup');

    await expect(page.getByTestId('gateway-site-id')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('gateway-site-id')).toHaveValue(fleetSiteId);

    await page.getByLabel('Site Name').fill(savedTitle);
    await page.getByTestId('gateway-site-save').click();
    await expect(page.getByText(/Saved commissioning to gateway/)).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel('Site Name').fill('Temporary Local Title');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Temporary Local Title');

    await page.getByTestId('gateway-site-load').click();
    await expect(page.getByText(/Loaded commissioning from gateway/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(savedTitle);
  });

  test('installer saves commissioning with fleet installerId', async ({ page }) => {
    const fleetId = 'e2e_installer_acme';
    const siteFileId = 'e2e_installer_site_a';
    const siteTitle = 'Installer Gateway E2E Title';

    await freshApp(page);
    await loginAs(page, 'installer', { installerId: fleetId, siteId: siteFileId });
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Site Setup');

    await expect(page.getByTestId('gateway-site-id')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('gateway-site-id')).toHaveValue(siteFileId);
    await page.getByLabel('Site Name').fill(siteTitle);
    await page.getByTestId('gateway-site-save').click();
    await expect(page.getByText(/Saved commissioning to gateway/)).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel('Site Name').fill('Wrong local title');
    await page.getByTestId('gateway-site-load').click();
    await expect(page.getByText(/Loaded commissioning from gateway/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(siteTitle);
  });

  test('commissioning tab shows gateway pwaSiteConfig site name', async ({ page }) => {
    /** Must match default `siteId` on the gateway session (`site-001`) so Commissioning fetches the same file. */
    const siteId = 'site-001';
    const siteName = 'E2E Commissioning Gateway Site';

    await freshApp(page);
    await loginAs(page, 'manufacturer', { siteId });
    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Site Setup');
    await expect(page.getByTestId('gateway-site-id')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('gateway-site-id')).toHaveValue(siteId);
    await page.getByLabel('Site Name').fill(siteName);
    await page.getByTestId('gateway-site-save').click();
    await expect(page.getByText(/Saved commissioning to gateway/)).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel('Operating Mode').selectOption('dzx_virtual_meter');
    await gotoWorkspace(page, 'Operation');
    await gotoTab(page, 'Dynamic Zero Export');
    await page.locator('.feature-shell-nav').getByRole('button', { name: 'Commissioning' }).click();
    await expect(
      page.getByText(new RegExp(`gateway pwaSiteConfig:\\s*${siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)),
    ).toBeVisible({ timeout: 15_000 });
  });
});
