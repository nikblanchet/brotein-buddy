import { test, expect } from '@playwright/test';
import { STORAGE_KEY } from '../../src/lib/storage';

test.describe('Inventory Rearrange', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up test data via localStorage BEFORE navigation
    await context.addInitScript((key) => {
      const testState = {
        version: 2,
        boxes: [
          {
            id: 'box-1',
            flavorId: 'chocolate',
            quantity: 12,
            location: { stack: 1, height: 1 },
            isOpen: false,
          },
          {
            id: 'box-2',
            flavorId: 'vanilla',
            quantity: 10,
            location: { stack: 1, height: 2 },
            isOpen: false,
          },
          {
            id: 'box-3',
            flavorId: 'strawberry',
            quantity: 8,
            location: { stack: 2, height: 1 },
            isOpen: true,
          },
        ],
        flavors: [
          { id: 'chocolate', name: 'Chocolate', randomPool: 'caffeine-free' },
          { id: 'vanilla', name: 'Vanilla', randomPool: 'caffeine-free' },
          { id: 'strawberry', name: 'Strawberry', randomPool: 'caffeine-free' },
        ],
        favoriteFlavorId: null,
        settings: {},
      };
      localStorage.setItem(key, JSON.stringify(testState));
    }, STORAGE_KEY);

    // Navigate to home
    await page.goto('/#/');

    // Dismiss WelcomeModal if it appears
    try {
      const startFreshButton = page.getByRole('button', { name: /start fresh/i });
      await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
      await startFreshButton.click();
      await page.waitForTimeout(500); // Wait for modal close animation
    } catch {
      // Modal didn't appear (localStorage already prevents it), continue with test
    }
  });

  test('should reach the rearrange screen from the More tab', async ({ page }) => {
    // Post-refresh navigation: rearrange lives behind the More tab, not
    // a "Manage Inventory" button on the old Home screen.
    await page.getByTestId('nav-more').click();
    await page.getByRole('button', { name: /rearrange stacks/i }).click();

    await expect(page).toHaveURL(/\/inventory\/rearrange$/);
    await expect(page.locator('h1')).toContainText('Rearrange Boxes');
    await expect(page.locator('text=Drag boxes to reorder')).toBeVisible();
  });

  test('should display all stacks and boxes', async ({ page }) => {
    await page.goto('/#/inventory/rearrange');

    // Check stacks exist
    await expect(page.locator('text=Stack 1')).toBeVisible();
    await expect(page.locator('text=Stack 2')).toBeVisible();

    // Check boxes are visible with flavors
    await expect(page.locator('text=Chocolate')).toBeVisible();
    await expect(page.locator('text=Vanilla')).toBeVisible();
    await expect(page.locator('text=Strawberry')).toBeVisible();
  });

  test('should show confirm and cancel buttons', async ({ page }) => {
    await page.goto('/#/inventory/rearrange');

    await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('should navigate back on cancel', async ({ page }) => {
    await page.goto('/#/inventory/rearrange');

    await page.click('button:has-text("Cancel")');

    // Should be back on inventory
    await expect(page).toHaveURL('/#/inventory');
  });

  test('should confirm valid rearrangement', async ({ page }) => {
    await page.goto('/#/inventory/rearrange');

    // Confirm button should be enabled for valid state
    const confirmButton = page.getByRole('button', { name: /confirm/i });
    await expect(confirmButton).toBeEnabled();

    // Click confirm
    await confirmButton.click();

    // Should navigate back to inventory
    await expect(page).toHaveURL('/#/inventory');
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/#/inventory/rearrange');

    // Verify responsive layout
    await expect(page.locator('.stacks-container')).toBeVisible();
    await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible();

    // Buttons should be full width on mobile
    const actions = page.locator('.actions');
    await expect(actions).toBeVisible();
  });

  test('should show boxes with correct quantities', async ({ page }) => {
    await page.goto('/#/inventory/rearrange');

    // Verify quantities shown. Scope to .box-quantity so the substring
    // match can't collide with the globally-mounted Add Inventory
    // panel's "Sealed boxes — 12 bottles each" copy.
    await expect(page.locator('.box-quantity', { hasText: '12 bottles' })).toBeVisible();
    await expect(page.locator('.box-quantity', { hasText: '10 bottles' })).toBeVisible();
    await expect(page.locator('.box-quantity', { hasText: '8 bottles' })).toBeVisible();
  });

  test('should display header and instructions', async ({ page }) => {
    await page.goto('/#/inventory/rearrange');

    await expect(page.locator('h1')).toHaveText('Rearrange Boxes');
    await expect(page.locator('text=Drag boxes to reorder')).toBeVisible();
  });
});
