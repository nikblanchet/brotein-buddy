/**
 * Box Edit smoke coverage for the post-refresh stage-header /
 * stepper / segmented / sticky-footer layout.
 *
 * Drops the old Add/Remove/Set/Change Location/Toggle Open
 * tap-modal flow tests; those modals are gone (the stepper +
 * segmented control replaces the quantity/status modals, and
 * location editing moved entirely to the Rearrange screen).
 */

import { test, expect, Page } from '@playwright/test';
import type { AppState } from '../../src/types/models';
import { STORAGE_KEY } from '../../src/lib/storage';

const seed: AppState = {
  version: 2,
  boxes: [
    {
      id: 'box-edit',
      flavorId: 'flavor-mint',
      quantity: 5,
      location: { stack: 1, height: 1 },
      isOpen: true,
    },
  ],
  flavors: [{ id: 'flavor-mint', name: 'Mint', randomPool: 'caffeine-free' }],
  favoriteFlavorId: null,
  settings: {},
  events: [],
};

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
  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
    key: STORAGE_KEY,
    value: JSON.stringify(seed),
  });
  await page.addInitScript(() => window.localStorage.setItem('broteinbuddy_welcome_shown', 'true'));
  await page.goto('/#/inventory/box-edit/edit');
  await dismissWelcome(page);
});

test('renders the stage header, hero tile, and stepper', async ({ page }) => {
  await expect(page.getByTestId('box-edit-screen')).toBeVisible();
  await expect(page.getByTestId('box-edit-back')).toBeVisible();
  await expect(page.getByTestId('box-edit-hero')).toContainText('Mint');
  await expect(page.getByTestId('box-edit-hero')).toContainText('Stack 1 · Row 1');
  await expect(page.getByTestId('qty-readout')).toHaveText('5');
});

test('the stepper increments and decrements within bounds', async ({ page }) => {
  await page.getByTestId('qty-plus').click();
  await expect(page.getByTestId('qty-readout')).toHaveText('6');
  await page.getByTestId('qty-minus').click();
  await expect(page.getByTestId('qty-readout')).toHaveText('5');
});

test('Save persists the new quantity and returns to inventory', async ({ page }) => {
  await page.getByTestId('qty-plus').click();
  await page.getByTestId('save-btn').click();
  await expect(page).toHaveURL(/#\/inventory$/);
  await expect(page.getByTestId('inv-tally')).toContainText('6');
});

test('Cancel discards changes', async ({ page }) => {
  await page.getByTestId('qty-plus').click();
  await page.getByTestId('cancel-btn').click();
  await expect(page).toHaveURL(/#\/inventory$/);
  await expect(page.getByTestId('inv-tally')).toContainText('5');
});

test('toggling Sealed sets aria-pressed correctly', async ({ page }) => {
  // Box starts open, so Open is the pressed segment
  await expect(page.getByTestId('status-open')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('status-sealed')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('status-sealed').click();
  await expect(page.getByTestId('status-sealed')).toHaveAttribute('aria-pressed', 'true');
});

test('Remove opens the confirmation modal and deletes on confirm', async ({ page }) => {
  await page.getByTestId('remove-box-btn').click();
  await expect(page.getByRole('heading', { name: 'Remove box' })).toBeVisible();
  await page.getByTestId('confirm-remove-btn').click();
  await expect(page).toHaveURL(/#\/inventory$/);
  await expect(page.getByTestId('inv-tally')).toContainText('0');
});
