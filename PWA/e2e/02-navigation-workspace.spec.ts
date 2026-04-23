import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, loginAs } from './helpers';

const tabs = [
  'Dynamic Zero Export',
  'Dashboard',
  'Site Setup',
  'Topology',
  'Source Slots',
  'Templates',
  'Validation',
  'Engineer Actions',
  'YAML Preview',
] as const;

test.describe('Primary navigation', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'manufacturer');
  });

  for (const label of tabs) {
    test(`tab "${label}" activates workspace label`, async ({ page }) => {
      await gotoTab(page, label);
      await expect(page.getByTestId('workspace-active')).toHaveText(label);
      await expect(page.locator('#main-content')).toBeVisible();
    });
  }
});
