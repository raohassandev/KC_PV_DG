import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, loginAs } from './helpers';

test.describe('Owner (User role) journey', () => {
  test('post-login lands on Energy History; single-workspace shell hides workspace strip', async ({
    page,
  }) => {
    await freshApp(page);
    await loginAs(page, 'user');
    await expect(page.getByTestId('workspace-nav')).toHaveCount(0);
    await expect(page.getByTestId('energy-analytics')).toBeVisible();
    await expect(page.getByTestId('energy-interval-select')).toBeVisible();
    await expect(page.getByTestId('energy-analytics-chart')).toBeVisible();
  });

  test('from Live status, owner reaches Energy History within two deliberate clicks', async ({
    page,
  }) => {
    await freshApp(page);
    await loginAs(page, 'user');
    await gotoTab(page, 'Live status');
    await page.getByTestId('owner-cta-energy-history').click();
    await expect(page.getByTestId('energy-analytics')).toBeVisible();
    await expect(page.getByTestId('energy-interval-select')).toBeVisible();
    await expect(page.getByTestId('energy-analytics-chart')).toBeVisible();
  });

  test('from Live status, owner reaches Reliability via dashboard CTA', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'user');
    await gotoTab(page, 'Live status');
    await page.getByTestId('owner-cta-reliability').click();
    await expect(page.getByTestId('reliability-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible();
  });
});
