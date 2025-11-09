/**
 * End-to-end tests for the Manual Flavor Selection flow
 *
 * Tests the complete manual selection user journey from home screen through
 * flavor picker modal to confirmation.
 *
 * @group e2e
 * @module tests/e2e/manual-flow
 */

import { test, expect } from '@playwright/test';
import type { AppState } from '../../src/types/models';
import { STORAGE_KEY } from '../../src/lib/storage';

test.describe('Manual Flavor Selection Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up localStorage with test state
    await context.addInitScript((key) => {
      const testState: AppState = {
        version: 1,
        flavors: [
          { id: 'chocolate', name: 'Chocolate', excludeFromRandom: false },
          { id: 'vanilla', name: 'Vanilla', excludeFromRandom: false },
          { id: 'strawberry', name: 'Strawberry', excludeFromRandom: true },
        ],
        boxes: [
          {
            id: 'box-choc-1',
            flavorId: 'chocolate',
            quantity: 8,
            location: { stack: 1, height: 0 },
            isOpen: true,
          },
          {
            id: 'box-van-1',
            flavorId: 'vanilla',
            quantity: 5,
            location: { stack: 2, height: 0 },
            isOpen: false,
          },
          {
            id: 'box-straw-1',
            flavorId: 'strawberry',
            quantity: 3,
            location: { stack: 3, height: 0 },
            isOpen: true,
          },
        ],
        favoriteFlavorId: null,
        settings: {},
      };
      localStorage.setItem(key, JSON.stringify(testState));
    }, STORAGE_KEY);

    // Navigate to home screen
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

    await expect(page.locator('h1')).toContainText('BroteinBuddy');
  });

  test('opens flavor picker modal when Choose Flavor clicked', async ({ page }) => {
    const chooseFlavorButton = page.locator('button').filter({ hasText: 'Choose Flavor' });
    await chooseFlavorButton.click();

    // Modal should appear with title
    await expect(page.locator('text=Choose a Flavor')).toBeVisible();
  });

  test('displays all flavors in picker modal', async ({ page }) => {
    const chooseFlavorButton = page.locator('button').filter({ hasText: 'Choose Flavor' });
    await chooseFlavorButton.click();

    // Should show all three flavors
    await expect(page.locator('.flavor-item').filter({ hasText: 'Chocolate' })).toBeVisible();
    await expect(page.locator('.flavor-item').filter({ hasText: 'Vanilla' })).toBeVisible();
    await expect(page.locator('.flavor-item').filter({ hasText: 'Strawberry' })).toBeVisible();
  });

  test('shows excluded badge for excluded flavors', async ({ page }) => {
    const chooseFlavorButton = page.locator('button').filter({ hasText: 'Choose Flavor' });
    await chooseFlavorButton.click();

    // Strawberry should have excluded badge
    const strawberryItem = page.locator('.flavor-item').filter({ hasText: 'Strawberry' });
    await expect(strawberryItem.locator('.excluded-badge')).toBeVisible();
    await expect(strawberryItem.locator('.excluded-badge')).toContainText('Excluded from Random');
  });

  test('navigates to confirmation when flavor selected', async ({ page }) => {
    const chooseFlavorButton = page.locator('button').filter({ hasText: 'Choose Flavor' });
    await chooseFlavorButton.click();

    // Click on Chocolate flavor
    const chocolateItem = page.locator('.flavor-item').filter({ hasText: 'Chocolate' });
    await chocolateItem.click();

    // Should navigate to confirmation screen
    await expect(page).toHaveURL(/#\/random\/confirm/);

    // Should show selected flavor name
    await expect(page.locator('h1')).toContainText('Chocolate');
  });

  test('can select different flavors and each navigates to confirmation', async ({ page }) => {
    // Test Vanilla selection
    await page.locator('button').filter({ hasText: 'Choose Flavor' }).click();
    await page.locator('.flavor-item').filter({ hasText: 'Vanilla' }).click();
    await expect(page).toHaveURL(/#\/random\/confirm/);
    await expect(page.locator('h1')).toContainText('Vanilla');

    // Go back to home and test Strawberry selection
    await page.goto('/#/');

    // Dismiss WelcomeModal if it appears
    try {
      const startFreshButton = page.getByRole('button', { name: /start fresh/i });
      await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
      await startFreshButton.click();
      await page.waitForTimeout(500);
    } catch {
      // Modal didn't appear, continue
    }

    await expect(page.locator('h1')).toContainText('BroteinBuddy');
    await page.locator('button').filter({ hasText: 'Choose Flavor' }).click();
    await page.locator('.flavor-item').filter({ hasText: 'Strawberry' }).click();
    await expect(page).toHaveURL(/#\/random\/confirm/);
    await expect(page.locator('h1')).toContainText('Strawberry');
  });

  test('can close modal by clicking backdrop', async ({ page }) => {
    const chooseFlavorButton = page.locator('button').filter({ hasText: 'Choose Flavor' });
    await chooseFlavorButton.click();

    // Modal should be visible
    await expect(page.locator('text=Choose a Flavor')).toBeVisible();

    // Click backdrop (outside modal content)
    await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } });

    // Modal should close
    await expect(page.locator('text=Choose a Flavor')).not.toBeVisible();

    // Should still be on home page
    await expect(page).toHaveURL(/#\/$/);
  });

  test.skip('shows empty state when no flavors configured', async ({ page }) => {
    // Navigate away first
    await page.goto('/#/inventory');

    // Dismiss WelcomeModal if it appears
    try {
      const startFreshButton = page.getByRole('button', { name: /start fresh/i });
      await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
      await startFreshButton.click();
      await page.waitForTimeout(500);
    } catch {
      // Modal didn't appear, continue
    }

    // Clear localStorage and set empty state
    await page.evaluate((key) => {
      const emptyState = {
        version: 1,
        flavors: [],
        boxes: [],
        favoriteFlavorId: null,
        settings: {},
      };
      localStorage.setItem(key, JSON.stringify(emptyState));
    }, STORAGE_KEY);

    // Navigate back to home to apply the empty state
    await page.goto('/#/');

    // Dismiss WelcomeModal if it appears
    try {
      const startFreshButton = page.getByRole('button', { name: /start fresh/i });
      await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
      await startFreshButton.click();
      await page.waitForTimeout(500);
    } catch {
      // Modal didn't appear, continue
    }

    await expect(page.locator('h1')).toContainText('BroteinBuddy');

    const chooseFlavorButton = page.locator('button').filter({ hasText: 'Choose Flavor' });
    await chooseFlavorButton.click();

    // Wait for modal to open
    await expect(page.locator('text=Choose a Flavor')).toBeVisible();

    // Should show empty state message
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state p')).toContainText('No flavors available');
  });

  test('completes full manual selection flow: home -> modal -> confirm -> confirm action', async ({
    page,
  }) => {
    // Start from home
    await expect(page.locator('h1')).toContainText('BroteinBuddy');

    // Open modal
    await page.locator('button').filter({ hasText: 'Choose Flavor' }).click();
    await expect(page.locator('text=Choose a Flavor')).toBeVisible();

    // Select flavor
    await page.locator('.flavor-item').filter({ hasText: 'Chocolate' }).click();
    await expect(page).toHaveURL(/#\/random\/confirm/);
    await expect(page.locator('h1')).toContainText('Chocolate');

    // Confirm selection
    await page.locator('button').filter({ hasText: 'Confirm' }).first().click();

    // Should navigate back to home
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('h1')).toContainText('BroteinBuddy');
  });
});
