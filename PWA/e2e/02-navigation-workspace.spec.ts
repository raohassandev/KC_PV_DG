import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, gotoWorkspace, loginAs } from './helpers';

const operationTabs = ['Dashboard'] as const;
const commissioningTabs = [
  'Site Setup',
  'Topology',
  'Source Slots',
  'Templates',
  'Validation',
  'YAML Export',
  'Engineer Actions',
] as const;

test.describe('Primary navigation', () => {
  test.beforeEach(async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'manufacturer');
  });

  for (const label of operationTabs) {
    test(`operation "${label}" activates workspace label`, async ({ page }) => {
      await gotoWorkspace(page, 'Operation');
      await gotoTab(page, label);
      await expect(page.getByTestId('workspace-active')).toContainText(`Operation · ${label}`);
      await expect(page.locator('#main-content')).toBeVisible();
    });
  }

  for (const label of commissioningTabs) {
    test(`commissioning "${label}" activates workspace label`, async ({ page }) => {
      await gotoWorkspace(page, 'Commissioning');
      await gotoTab(page, label);
      await expect(page.getByTestId('workspace-active')).toContainText(`Commissioning · ${label}`);
      await expect(page.locator('#main-content')).toBeVisible();
    });
  }
});
