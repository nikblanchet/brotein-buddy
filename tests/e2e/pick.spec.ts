/**
 * E2E coverage for the Pick screen and its result sheet.
 *
 * Replaces the older home/random/random-confirm/manual-flow/favorite-flow
 * specs - all of those routes folded into Pick + the App-level
 * PickResultSheet during the 2026 UX refresh.
 *
 * Smoke coverage rather than exhaustive: pool buttons rendered with
 * stock counts, result sheet appears after a pool tap, "Taking it"
 * decrements the box, the favorite pill set/run flow works, and the
 * "Choose a specific flavor" link opens the manual-pick sheet.
 */

import { test, expect, Page } from '@playwright/test';
import type { AppState } from '../../src/types/models';
import { STORAGE_KEY } from '../../src/lib/storage';

const seed: AppState = {
  version: 2,
  boxes: [
    {
      id: 'box-c1',
      flavorId: 'flavor-coffee',
      quantity: 12,
      location: { stack: 1, height: 1 },
      isOpen: true,
    },
    {
      id: 'box-d1',
      flavorId: 'flavor-vanilla',
      quantity: 8,
      location: { stack: 2, height: 1 },
      isOpen: true,
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
  await page.goto('/#/');
  await dismissWelcome(page);
});

test('renders the Pick screen as the default route', async ({ page }) => {
  await expect(page.getByTestId('pick-screen')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pick a flavor' })).toBeVisible();
});

test('pool buttons show in-stock counts and are enabled', async ({ page }) => {
  const caff = page.getByTestId('pool-caff-btn');
  const decaf = page.getByTestId('pool-decaf-btn');
  await expect(caff).toBeVisible();
  await expect(caff).not.toBeDisabled();
  await expect(caff).toContainText('12 bottles in pool');
  await expect(decaf).toBeVisible();
  await expect(decaf).not.toBeDisabled();
  await expect(decaf).toContainText('8 bottles in pool');
});

test('tapping a pool button opens the result sheet', async ({ page }) => {
  await page.getByTestId('pool-caff-btn').click();
  const sheet = page.getByTestId('pick-result-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Coffee');
  await expect(page.getByTestId('pick-again-btn')).toBeVisible();
  await expect(page.getByTestId('taking-it-btn')).toBeVisible();
});

test('Taking it decrements the box and dismisses the sheet', async ({ page }) => {
  await page.getByTestId('pool-decaf-btn').click();
  await page.getByTestId('taking-it-btn').click();
  await expect(page.getByTestId('pick-result-sheet')).toBeHidden();
  // Inventory now has 7 bottles in the vanilla box (8 - 1)
  await page.getByTestId('nav-inventory').click();
  await expect(page.getByTestId('inv-tally')).toContainText('19');
});

test('Set Favorite pill opens the picker when no favorite is set', async ({ page }) => {
  const pill = page.getByTestId('favorite-pill');
  await expect(pill).toContainText('Set a favorite');
  await pill.click();
  await expect(page.getByTestId('flavor-picker-sheet')).toBeVisible();
});

test('Choosing a specific flavor opens the picker and runs a manual pick', async ({ page }) => {
  await page.getByTestId('choose-specific-link').click();
  const sheet = page.getByTestId('flavor-picker-sheet');
  await expect(sheet).toBeVisible();
  await page.getByTestId('flavor-row-flavor-coffee').click();
  await expect(page.getByTestId('pick-result-sheet')).toBeVisible();
  await expect(page.getByTestId('pick-result-sheet')).toContainText('Coffee');
});

test('persistent tab bar is rendered and Pick is the active tab', async ({ page }) => {
  const navPick = page.getByTestId('nav-pick');
  await expect(navPick).toBeVisible();
  await expect(navPick).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('nav-inventory')).toBeVisible();
  await expect(page.getByTestId('nav-more')).toBeVisible();
});
