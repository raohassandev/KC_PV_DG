import type { Page } from '@playwright/test';

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
