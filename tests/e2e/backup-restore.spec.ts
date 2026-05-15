/**
 * Backup & Restore smoke coverage.
 *
 * Backup & restore moves to the More tab in the 2026 refresh; the
 * Inventory header no longer hosts the trigger. The modal itself
 * (BackupRestoreModal) is unchanged so this spec only verifies the
 * new entry path.
 */

import { test, expect, Page } from '@playwright/test';

async function dismissWelcome(page: Page) {
  try {
    const startFresh = page.getByRole('button', { name: /start fresh/i });
    await startFresh.waitFor({ state: 'visible', timeout: 1500 });
    await startFresh.click();
  } catch {
    // already dismissed
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('broteinbuddy_welcome_shown', 'true'));
  await page.goto('/#/more');
  await dismissWelcome(page);
});

test('More screen lists Backup & restore as a tap target', async ({ page }) => {
  const row = page.getByRole('button', { name: /backup.*restore/i });
  await expect(row).toBeVisible();
});

test('Tapping Backup & restore opens the modal', async ({ page }) => {
  await page.getByRole('button', { name: /backup.*restore/i }).click();
  // BackupRestoreModal opens with this title
  await expect(page.getByRole('heading', { name: /backup.*restore/i })).toBeVisible();
});
