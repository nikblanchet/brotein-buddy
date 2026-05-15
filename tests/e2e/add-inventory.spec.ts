/**
 * Add Inventory smoke coverage for the post-refresh sheet/panel.
 *
 * The Modal-wrapped wizard is replaced by an App-mounted bottom sheet
 * (phone) / right side panel (laptop). Same content; different
 * container. Smoke verifies the sheet opens via the FAB, the mode
 * select advances to the closed-detail step, and the dynamic confirm
 * label adds a closed box at the suggested location.
 */

import { test, expect, Page } from '@playwright/test';
import type { AppState } from '../../src/types/models';
import { STORAGE_KEY } from '../../src/lib/storage';

const seed: AppState = {
  version: 2,
  boxes: [
    {
      id: 'box-existing',
      flavorId: 'flavor-mocha',
      quantity: 12,
      location: { stack: 1, height: 1 },
      isOpen: false,
    },
  ],
  flavors: [{ id: 'flavor-mocha', name: 'Mocha', randomPool: 'caffeinated' }],
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

/**
 * Opens the Add Inventory panel via whichever affordance the current
 * viewport exposes: the FAB on phone widths, the topbar "+ Add
 * inventory" button on laptop widths.
 */
async function openAddInventory(page: Page) {
  const fab = page.getByTestId('add-inventory-fab');
  if (await fab.isVisible()) {
    await fab.click();
  } else {
    await page.getByTestId('topbar-add-inventory').click();
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
  await openAddInventory(page);
});

test('FAB opens the panel on the mode-select step', async ({ page }) => {
  const panel = page.getByTestId('add-inventory-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('mode-closed')).toBeVisible();
  await expect(page.getByTestId('mode-open')).toBeVisible();
});

test('Closed mode advances to flavor + count + location form', async ({ page }) => {
  await page.getByTestId('mode-closed').click();
  await expect(page.getByTestId('add-inv-flavor-flavor-mocha')).toBeVisible();
  // First flavor is preselected
  await expect(page.getByTestId('add-inv-flavor-flavor-mocha')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.getByTestId('loc-readout')).toBeVisible();
  await expect(page.getByTestId('add-inv-confirm')).toBeDisabled();
});

test('Adding 1 closed box at the suggested location appears in inventory', async ({ page }) => {
  await page.getByTestId('mode-closed').click();
  await page.getByRole('button', { name: 'Select 1' }).click();
  const confirm = page.getByTestId('add-inv-confirm');
  await expect(confirm).toContainText('Add 1 box · 12 bottles');
  await confirm.click();
  await expect(page.getByTestId('add-inventory-panel')).toHaveAttribute('aria-hidden', 'true');
  // 24 bottles total now (12 existing + 12 new)
  await expect(page.getByTestId('inv-tally')).toContainText('24');
});

test('Cancel closes the panel without writing', async ({ page }) => {
  await page.getByTestId('mode-closed').click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByTestId('add-inventory-panel')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByTestId('inv-tally')).toContainText('12');
});
