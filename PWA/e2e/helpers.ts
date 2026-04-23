import { expect, type Page } from '@playwright/test';

export async function gotoTab(page: Page, label: string) {
  await page.getByTestId('app-nav').getByRole('button', { name: label }).click();
}

export async function dismissNoticeIfPresent(page: Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss' });
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
}

/** Clear persisted site so slot/device E2E changes do not leak across tests. */
export async function freshApp(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissNoticeIfPresent(page);
}

const E2E_LOGIN: Record<'user' | 'installer' | 'manufacturer', string> = {
  user: 'DevUser!1',
  installer: 'DevInstall!1',
  manufacturer: 'DevMfg!1',
};

export async function loginAs(
  page: Page,
  role: keyof typeof E2E_LOGIN,
  opts?: { installerId?: string; siteId?: string },
) {
  await page.getByTestId('login-channel').selectOption(role);
  if (role === 'installer' && opts?.installerId) {
    await page.getByTestId('login-installer-id').fill(opts.installerId);
  }
  const siteField = page.getByTestId('login-site-id');
  if (opts?.siteId && (await siteField.isVisible().catch(() => false))) {
    await siteField.fill(opts.siteId);
  }
  await page.getByTestId('login-password').fill(E2E_LOGIN[role]);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('app-nav')).toBeVisible({ timeout: 30_000 });
}
