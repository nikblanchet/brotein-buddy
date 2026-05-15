/**
 * Inventory screen smoke coverage for the post-refresh structure.
 *
 * The pre-refresh table view, view-mode toggle, and Rearrange/New-flavor
 * buttons are gone. This spec covers the new tally + chips + Active /
 * Storage section layout, the FAB that triggers the AddInventoryPanel,
 * and box-card navigation into Box Edit.
 */

import { test, expect, Page } from '@playwright/test';
import type { AppState } from '../../src/types/models';
import { STORAGE_KEY } from '../../src/lib/storage';

const seed: AppState = {
  version: 2,
  boxes: [
    {
      id: 'box-open',
      flavorId: 'flavor-coffee',
      quantity: 6,
      location: { stack: 1, height: 1 },
      isOpen: true,
    },
    {
      id: 'box-sealed',
      flavorId: 'flavor-vanilla',
      quantity: 12,
      location: { stack: 2, height: 1 },
      isOpen: false,
    },
  ],
  flavors: [
    { id: 'flavor-coffee', name: 'Coffee', randomPool: 'caffeinated' },
    { id: 'flavor-vanilla', name: 'Vanilla', randomPool: 'caffeine-free' },
  ],
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
  await page.goto('/#/inventory');
  await dismissWelcome(page);
});

test('renders the inventory screen with tally and filter chips', async ({ page }) => {
  await expect(page.getByTestId('inventory-screen')).toBeVisible();
  await expect(page.getByTestId('inv-tally')).toContainText('2');
  await expect(page.getByTestId('inv-tally')).toContainText('18');
  await expect(page.getByTestId('chip-all')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('chip-caff')).toBeVisible();
  await expect(page.getByTestId('chip-decaf')).toBeVisible();
});

test('partitions stacks into Active and Storage sections', async ({ page }) => {
  await expect(page.getByTestId('active-section')).toBeVisible();
  await expect(page.getByTestId('storage-section')).toBeVisible();
});

test('filter chip narrows the visible stacks', async ({ page }) => {
  await page.getByTestId('chip-caff').click();
  await expect(page.getByTestId('chip-caff')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('inv-tally')).toContainText('1');
  // Storage section disappears because the only sealed box is decaf.
  await expect(page.getByTestId('storage-section')).toHaveCount(0);
});

test('FAB opens the Add Inventory panel', async ({ page }) => {
  await page.getByTestId('add-inventory-fab').click();
  await expect(page.getByTestId('add-inventory-panel')).toBeVisible();
});

test('clicking a box card navigates to Box Edit', async ({ page }) => {
  await page.getByTestId('box-box-open').click();
  await expect(page).toHaveURL(/#\/inventory\/box-open\/edit$/);
  await expect(page.getByTestId('box-edit-screen')).toBeVisible();
});
