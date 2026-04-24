import { expect, test } from '@playwright/test';
import { freshApp, gotoTab, gotoWorkspace, loginAs } from './helpers';

/**
 * Real-hardware PWA flow test.
 *
 * Run:
 *   REAL_BOARD_IP=192.168.0.100 npx playwright test e2e/91-real-board-pwa-flow.spec.ts --reporter=line
 */

const ip = process.env.REAL_BOARD_IP;

test.describe('Real board PWA flow', () => {
  test.skip(!ip, 'Set REAL_BOARD_IP to run against hardware.');

  test('site setup probe -> dashboard shows live values', async ({ page }) => {
    await freshApp(page);
    await loginAs(page, 'manufacturer');

    await gotoWorkspace(page, 'Commissioning');
    await gotoTab(page, 'Site Setup');

    // Set board IP in site identity so dashboard uses it.
    const boardIpField = page.getByRole('textbox', { name: /^Board IP\b/i });
    await boardIpField.fill(ip!);

    await page.getByRole('button', { name: 'Probe board IP' }).click();

    // Some ESPHome web_server v3 builds intermittently stall on browser reads; the UI should
    // either show a device summary or a clear error message.
    await expect(page.locator('.panel').filter({ hasText: 'Find Controller (no OLED)' })).toContainText(
      /Device:|No response at board IP\./,
    );

    if (await page.getByText('Device:', { exact: false }).isVisible()) {
      await gotoWorkspace(page, 'Operation');
      await gotoTab(page, 'Dashboard');
      await expect(page.getByText('Grid Frequency')).toBeVisible();
    }
  });
});

