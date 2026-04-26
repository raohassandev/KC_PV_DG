import { test, expect } from '@playwright/test';
import {
  dismissNoticeIfPresent,
  freshApp,
  gotoTab,
  gotoWorkspace,
  loginAs,
} from './helpers';

async function setThemePreference(
  page: import('@playwright/test').Page,
  pref: 'light' | 'dark',
) {
  await page.evaluate((p) => {
    try {
      localStorage.setItem('pvdg.themePreference', p);
    } catch {
      /* ignore */
    }
  }, pref);
}

async function snap(page: import('@playwright/test').Page, path: string) {
  // Wait for layout/paint to settle a bit.
  await page.waitForTimeout(600);
  await page.screenshot({ path, fullPage: true });
}

async function clickAllTopTabsAndScreenshot(
  page: import('@playwright/test').Page,
  roleSlug: string,
  workspaceSlug: string,
  outDir: (name: string) => string,
) {
  const pillsNav = page.getByTestId('subnav-pills');
  const selectEl = page.getByTestId('subnav-select');

  const useSelect = await selectEl.isVisible().catch(() => false);
  const labels = useSelect
    ? await selectEl.locator('option').allTextContents()
    : await pillsNav.getByRole('button').allTextContents();

  for (const raw of labels) {
    const label = raw.trim();
    if (!label) continue;

    if (useSelect) {
      await selectEl.selectOption({ label });
    } else {
      await gotoTab(page, label);
    }
    await dismissNoticeIfPresent(page);
    await expect(page.locator('#main-content')).toBeVisible();

    const safeLabel = label
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    await snap(
      page,
      outDir(`${roleSlug}/${workspaceSlug}/tab-${safeLabel}.png`),
    );

    // If this is Monitoring, also capture its internal sub-tabs.
    const isMonitoring = safeLabel.includes('monitoring') || safeLabel.includes('energy');
    if (isMonitoring) {
      const subnav = page.getByTestId('monitoring-subnav');
      if (await subnav.isVisible().catch(() => false)) {
        const subButtons = subnav.getByRole('button');
        const subLabels = await subButtons.allTextContents();
        for (const subRaw of subLabels) {
          const subLabel = subRaw.trim();
          if (!subLabel) continue;
          await subnav.getByRole('button', { name: subLabel }).click();
          await dismissNoticeIfPresent(page);
          await expect(page.locator('#main-content')).toBeVisible();

          const safeSub = subLabel
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          await snap(
            page,
            outDir(`${roleSlug}/${workspaceSlug}/monitoring-${safeSub}.png`),
          );
        }
      }
    }
  }
}

test.describe('UI screenshots (all roles)', () => {
  // This test intentionally walks many pages and writes many images.
  test.setTimeout(6 * 60_000);
  test('capture all pages for user / installer / manufacturer', async ({
    page,
  }, testInfo) => {
    // Reduce motion for stable screenshots.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const outDir = (name: string) => testInfo.outputPath(`screenshots/${name}`);

    const roles: Array<'user' | 'installer' | 'manufacturer'> = [
      'user',
      'installer',
      'manufacturer',
    ];

    const variants: Array<{
      id: 's' | 'm' | 'l' | 'lg' | 'xxlg';
      viewport: { width: number; height: number };
    }> = [
      // S/M/L/LG/XXLG responsive variants (common breakpoints)
      { id: 's', viewport: { width: 375, height: 812 } },
      { id: 'm', viewport: { width: 768, height: 1024 } },
      { id: 'l', viewport: { width: 1024, height: 768 } },
      { id: 'lg', viewport: { width: 1280, height: 800 } },
      { id: 'xxlg', viewport: { width: 1536, height: 900 } },
    ];

    const themes: Array<'light' | 'dark'> = ['light', 'dark'];

    for (const variant of variants) {
      await page.setViewportSize(variant.viewport);

      for (const theme of themes) {
        for (const role of roles) {
          await freshApp(page);
          await setThemePreference(page, theme);
          await page.reload({ waitUntil: 'domcontentloaded' });

          await loginAs(page, role);
          await dismissNoticeIfPresent(page);

          const basePrefix = `${variant.id}/${theme}/${role}`;

          // Operation workspace screenshots (always present).
          await clickAllTopTabsAndScreenshot(page, basePrefix, 'operation', outDir);

          // Commissioning workspace screenshots (installer/manufacturer only).
          const workspaceNav = page.getByTestId('workspace-nav');
          if (await workspaceNav.isVisible().catch(() => false)) {
            await gotoWorkspace(page, 'Commissioning');
            await dismissNoticeIfPresent(page);
            await clickAllTopTabsAndScreenshot(page, basePrefix, 'commissioning', outDir);
          }

          // Sign out so the next role starts clean.
          await page.getByTestId('account-menu-trigger').click();
          await page.getByTestId('logout-button').click();
          await expect(page.getByTestId('login-submit')).toBeVisible();
        }
      }
    }
  });
});

