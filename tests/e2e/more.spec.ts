/**
 * E2E coverage for the More screen, focused on the Sync & Account
 * surface added when the UI refresh merged the Supabase sync backend.
 *
 * These run against the graceful-degradation path: with no Supabase env
 * vars (the CI environment) isSyncConfigured() is false, so the badge
 * stays hidden and the Sync sheet shows its "not configured" notice.
 * The live magic-link auth flow is out of e2e scope by design - it
 * needs a real Supabase project (see ADR-012).
 *
 * The sheet stays mounted when closed (translated off-screen for the
 * slide animation), so open/closed state is asserted via aria-hidden
 * rather than Playwright visibility.
 */

import { test, expect, Page } from '@playwright/test';

async function dismissWelcome(page: Page) {
  try {
    const startFresh = page.getByRole('button', { name: /start fresh/i });
    await startFresh.waitFor({ state: 'visible', timeout: 1500 });
    await startFresh.click();
  } catch {
    // welcome already dismissed
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('broteinbuddy_welcome_shown', 'true'));
  await page.goto('/#/more');
  await dismissWelcome(page);
});

test('More lists its four secondary-function rows', async ({ page }) => {
  await expect(page.getByRole('button', { name: /backup & restore/i })).toBeVisible();
  await expect(page.getByTestId('more-sync-row')).toBeVisible();
  await expect(page.getByRole('button', { name: /rearrange stacks/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
});

test('the Sync row opens the Sync & Account sheet', async ({ page }) => {
  const sheet = page.getByTestId('sync-account-sheet');
  await expect(sheet).toHaveAttribute('aria-hidden', 'true');
  await page.getByTestId('more-sync-row').click();
  await expect(sheet).toHaveAttribute('aria-hidden', 'false');
});

test('the Sync sheet shows the not-configured notice without Supabase env', async ({ page }) => {
  await page.getByTestId('more-sync-row').click();
  await expect(page.getByTestId('sync-account-sheet')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByText(/sync is not configured for this build/i)).toBeVisible();
  // The signed-out email form must not render in the not-configured state.
  await expect(page.getByTestId('sync-modal-email-input')).toHaveCount(0);
});

test('the Sync sheet closes via its close control', async ({ page }) => {
  const sheet = page.getByTestId('sync-account-sheet');
  await page.getByTestId('more-sync-row').click();
  await expect(sheet).toHaveAttribute('aria-hidden', 'false');
  await page.getByTestId('sync-sheet-close').click();
  await expect(sheet).toHaveAttribute('aria-hidden', 'true');
});

test('the sync status badge stays hidden when sync is not configured', async ({ page }) => {
  await expect(page.getByTestId('sync-status-badge')).toHaveCount(0);
});
