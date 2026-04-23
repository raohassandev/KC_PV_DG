import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, loginAs } from './helpers';

const savedTitle = 'Gateway E2E Site Title';
const fleetSiteId = 'e2e_gateway_sync_site';

test.describe('Gateway commissioning sync', () => {
  test('saves and reloads SiteConfig via VPS gateway', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'manufacturer');
    await gotoTab(page, 'Site Setup');

    await expect(page.getByTestId('gateway-site-id')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('gateway-site-id').fill(fleetSiteId);

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
});
