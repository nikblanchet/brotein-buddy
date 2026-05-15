/**
 * Routing smoke tests for the post-refresh route map.
 *
 * The old `/random` and `/random/confirm` routes are gone; `/more` is
 * new; `/component-demo` is removed. This spec verifies each surviving
 * route loads its expected screen-level content and that AppNav active
 * state stays in sync with the URL via aria-current.
 */

import { test, expect, Page } from '@playwright/test';
import { STORAGE_KEY } from '../../src/lib/storage';

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
});

test('/ renders the Pick screen', async ({ page }) => {
  await page.goto('/#/');
  await dismissWelcome(page);
  await expect(page.getByTestId('pick-screen')).toBeVisible();
});

test('/inventory renders the Inventory screen', async ({ page }) => {
  await page.goto('/#/inventory');
  await dismissWelcome(page);
  await expect(page.getByTestId('inventory-screen')).toBeVisible();
});

test('/more renders the More screen', async ({ page }) => {
  await page.goto('/#/more');
  await dismissWelcome(page);
  await expect(page.getByRole('heading', { name: 'More', level: 1 })).toBeVisible();
});

test('AppNav highlights the active tab from the URL', async ({ page }) => {
  await page.goto('/#/inventory');
  await dismissWelcome(page);
  await expect(page.getByTestId('nav-inventory')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('nav-pick')).not.toHaveAttribute('aria-current', 'page');

  await page.getByTestId('nav-more').click();
  await expect(page).toHaveURL(/#\/more$/);
  await expect(page.getByTestId('nav-more')).toHaveAttribute('aria-current', 'page');
});

test('unknown routes fall through to NotFound', async ({ page }) => {
  await page.goto('/#/this-route-does-not-exist');
  await dismissWelcome(page);
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});

test('persistent nav remains during deep-flow box edit', async ({ page }) => {
  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
    key: STORAGE_KEY,
    value: JSON.stringify({
      version: 2,
      boxes: [
        {
          id: 'box-x',
          flavorId: 'flavor-x',
          quantity: 6,
          location: { stack: 1, height: 1 },
          isOpen: true,
        },
      ],
      flavors: [{ id: 'flavor-x', name: 'Test Flavor', randomPool: 'caffeinated' }],
      favoriteFlavorId: null,
      settings: {},
      events: [],
    }),
  });
  await page.goto('/#/inventory/box-x/edit');
  await dismissWelcome(page);
  await expect(page.getByTestId('box-edit-screen')).toBeVisible();
  await expect(page.getByTestId('nav-pick')).toBeVisible();
  await expect(page.getByTestId('nav-inventory')).toBeVisible();
  await expect(page.getByTestId('nav-more')).toBeVisible();
});
