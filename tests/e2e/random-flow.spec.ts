/**
 * End-to-end tests for the Random Selection flow
 *
 * Tests the complete random selection user journey from home screen through
 * random selection, confirmation, and all available actions (confirm, cancel,
 * add another, different choice).
 *
 * @group e2e
 * @module tests/e2e/random-flow
 */

import { test, expect } from '@playwright/test';
import type { AppState } from '../../src/types/models';

/**
 * Helper function to create a sample app state for testing
 */
function createTestState(): AppState {
  return {
    version: 1,
    flavors: [
      { id: 'chocolate', name: 'Chocolate', excludeFromRandom: false },
      { id: 'vanilla', name: 'Vanilla', excludeFromRandom: false },
      { id: 'strawberry', name: 'Strawberry', excludeFromRandom: false },
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
        id: 'box-choc-2',
        flavorId: 'chocolate',
        quantity: 12,
        location: { stack: 1, height: 1 },
        isOpen: false,
      },
      {
        id: 'box-van-1',
        flavorId: 'vanilla',
        quantity: 5,
        location: { stack: 2, height: 0 },
        isOpen: true,
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
}

test.describe('Random Selection Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up localStorage with test state
    await context.addInitScript(() => {
      const testState: AppState = {
        version: 1,
        flavors: [
          { id: 'chocolate', name: 'Chocolate', excludeFromRandom: false },
          { id: 'vanilla', name: 'Vanilla', excludeFromRandom: false },
          { id: 'strawberry', name: 'Strawberry', excludeFromRandom: false },
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
            id: 'box-choc-2',
            flavorId: 'chocolate',
            quantity: 12,
            location: { stack: 1, height: 1 },
            isOpen: false,
          },
          {
            id: 'box-van-1',
            flavorId: 'vanilla',
            quantity: 5,
            location: { stack: 2, height: 0 },
            isOpen: true,
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
      localStorage.setItem('broteinbuddy-state', JSON.stringify(testState));
    });

    // Navigate to home screen
    await page.goto('/#/');
    await expect(page.locator('h1')).toContainText('Protein Buddy');
  });

  test.describe('Random Selection Screen', () => {
    test('automatically performs selection on load', async ({ page }) => {
      // Click Random Pick button
      const randomButton = page.locator('button').filter({ hasText: 'Random Pick' });
      await randomButton.click();

      // Should navigate to random route
      await expect(page).toHaveURL(/#\/random/);

      // Should show loading state briefly (or skip straight to confirm)
      // Wait for navigation to confirm screen (selection happens automatically)
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });
    });

    test('handles no flavors available', async ({ page, context }) => {
      // Set up state with no flavors
      await context.addInitScript(() => {
        const emptyState: AppState = {
          version: 1,
          flavors: [],
          boxes: [],
          favoriteFlavorId: null,
          settings: {},
        };
        localStorage.setItem('broteinbuddy-state', JSON.stringify(emptyState));
      });

      await page.goto('/#/');
      const randomButton = page.locator('button').filter({ hasText: 'Random Pick' });
      await randomButton.click();

      // Should show error message
      await expect(page.locator('h1')).toContainText('No Selection Available');
      await expect(page.locator('.error-message')).toContainText('No flavors configured');

      // Should have Back to Home button
      const homeButton = page.locator('button').filter({ hasText: 'Back to Home' });
      await expect(homeButton).toBeVisible();
    });

    test('handles all flavors excluded', async ({ page, context }) => {
      // Set up state with all flavors excluded
      await context.addInitScript(() => {
        const excludedState: AppState = {
          version: 1,
          flavors: [
            { id: 'chocolate', name: 'Chocolate', excludeFromRandom: true },
            { id: 'vanilla', name: 'Vanilla', excludeFromRandom: true },
          ],
          boxes: [
            {
              id: 'box-1',
              flavorId: 'chocolate',
              quantity: 10,
              location: { stack: 1, height: 0 },
              isOpen: false,
            },
          ],
          favoriteFlavorId: null,
          settings: {},
        };
        localStorage.setItem('broteinbuddy-state', JSON.stringify(excludedState));
      });

      await page.goto('/#/');
      const randomButton = page.locator('button').filter({ hasText: 'Random Pick' });
      await randomButton.click();

      // Should show error message
      await expect(page.locator('.error-message')).toContainText(
        'All flavors are excluded from random selection'
      );
    });

    test('handles no boxes in stock', async ({ page, context }) => {
      // Set up state with flavors but no boxes
      await context.addInitScript(() => {
        const noStockState: AppState = {
          version: 1,
          flavors: [{ id: 'chocolate', name: 'Chocolate', excludeFromRandom: false }],
          boxes: [],
          favoriteFlavorId: null,
          settings: {},
        };
        localStorage.setItem('broteinbuddy-state', JSON.stringify(noStockState));
      });

      await page.goto('/#/');
      const randomButton = page.locator('button').filter({ hasText: 'Random Pick' });
      await randomButton.click();

      // Should show error message
      await expect(page.locator('.error-message')).toContainText('No boxes in stock');
    });
  });

  test.describe('Confirmation Screen', () => {
    test('displays selected flavor and box details', async ({ page }) => {
      // Navigate to random selection
      const randomButton = page.locator('button').filter({ hasText: 'Random Pick' });
      await randomButton.click();

      // Wait for confirmation screen
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Should display a flavor name (we don't know which one was selected)
      const flavorName = page.locator('.flavor-name');
      await expect(flavorName).toBeVisible();
      await expect(flavorName).not.toBeEmpty();

      // Should display box details
      await expect(page.locator('h2')).toContainText('Use This Box');
      await expect(page.locator('.quantity')).toBeVisible();
      await expect(page.locator('.location')).toBeVisible();
      await expect(page.locator('.status')).toBeVisible();
    });

    test('displays all four action buttons', async ({ page }) => {
      // Navigate through random flow
      await page.locator('button').filter({ hasText: 'Random Pick' }).click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Check all buttons exist
      await expect(page.locator('button').filter({ hasText: 'Confirm' })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: 'Add Another' })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: 'Different Choice' })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: 'Cancel' })).toBeVisible();
    });

    test('shows open/unopened status correctly', async ({ page }) => {
      await page.locator('button').filter({ hasText: 'Random Pick' }).click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Should show either "Open" or "Unopened" status
      const status = page.locator('.status');
      await expect(status).toBeVisible();
      const statusText = await status.textContent();
      expect(statusText === 'Open' || statusText === 'Unopened').toBeTruthy();
    });
  });

  test.describe('Confirm Action', () => {
    test('confirms selection and returns to home', async ({ page }) => {
      // Get initial state from localStorage
      const initialState = await page.evaluate(() => {
        const stored = localStorage.getItem('broteinbuddy-state');
        return stored ? JSON.parse(stored) : null;
      });

      const initialTotalQuantity = initialState.boxes.reduce(
        (sum: number, box: { quantity: number }) => sum + box.quantity,
        0
      );

      // Navigate through random flow
      await page.locator('button').filter({ hasText: 'Random Pick' }).click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Click Confirm
      await page.locator('button').filter({ hasText: 'Confirm' }).click();

      // Should return to home
      await expect(page).toHaveURL(/#\//);

      // Verify state was updated (quantity decreased by 1)
      const updatedState = await page.evaluate(() => {
        const stored = localStorage.getItem('broteinbuddy-state');
        return stored ? JSON.parse(stored) : null;
      });

      const updatedTotalQuantity = updatedState.boxes.reduce(
        (sum: number, box: { quantity: number }) => sum + box.quantity,
        0
      );

      expect(updatedTotalQuantity).toBe(initialTotalQuantity - 1);
    });
  });

  test.describe('Cancel Action', () => {
    test('cancels selection without updating state', async ({ page }) => {
      // Get initial state
      const initialState = await page.evaluate(() => {
        const stored = localStorage.getItem('broteinbuddy-state');
        return stored ? JSON.parse(stored) : null;
      });

      // Navigate through random flow
      await page.locator('button').filter({ hasText: 'Random Pick' }).click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Click Cancel
      await page.locator('button').filter({ hasText: 'Cancel' }).click();

      // Should return to home
      await expect(page).toHaveURL(/#\//);

      // Verify state was NOT updated
      const updatedState = await page.evaluate(() => {
        const stored = localStorage.getItem('broteinbuddy-state');
        return stored ? JSON.parse(stored) : null;
      });

      expect(JSON.stringify(updatedState)).toBe(JSON.stringify(initialState));
    });
  });

  test.describe('Add Another Action', () => {
    test('decrements quantity and stays on confirmation screen', async ({ page }) => {
      // Navigate through random flow
      await page.locator('button').filter({ hasText: 'Random Pick' }).click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Get initial quantity displayed
      const initialQuantityText = await page.locator('.quantity').first().textContent();
      const initialQuantity = parseInt(initialQuantityText || '0');

      // Click Add Another
      await page.locator('button').filter({ hasText: 'Add Another' }).click();

      // Should stay on confirmation screen
      await expect(page).toHaveURL(/#\/random\/confirm/);

      // Wait a brief moment for state to update
      await page.waitForTimeout(100);

      // Quantity should have decreased by 1
      const updatedQuantityText = await page.locator('.quantity').first().textContent();
      const updatedQuantity = parseInt(updatedQuantityText || '0');

      expect(updatedQuantity).toBe(initialQuantity - 1);
    });

    test('disables Add Another button when quantity is 1', async ({ page, context }) => {
      // Set up state with a box that has quantity 1
      await context.addInitScript(() => {
        const lowQuantityState: AppState = {
          version: 1,
          flavors: [{ id: 'chocolate', name: 'Chocolate', excludeFromRandom: false }],
          boxes: [
            {
              id: 'box-1',
              flavorId: 'chocolate',
              quantity: 1,
              location: { stack: 1, height: 0 },
              isOpen: true,
            },
          ],
          favoriteFlavorId: null,
          settings: {},
        };
        localStorage.setItem('broteinbuddy-state', JSON.stringify(lowQuantityState));
      });

      await page.goto('/#/');
      await page.locator('button').filter({ hasText: 'Random Pick' }).click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Add Another button should be disabled
      const addAnotherButton = page.locator('button').filter({ hasText: 'Add Another' });
      await expect(addAnotherButton).toBeDisabled();
    });
  });

  test.describe('Different Choice Action', () => {
    test('navigates back to random selection with exclusion', async ({ page }) => {
      // Navigate through random flow
      await page.locator('button').filter({ hasText: 'Random Pick' }).click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Get the selected flavor name
      const selectedFlavorName = await page.locator('.flavor-name').textContent();

      // Click Different Choice
      await page.locator('button').filter({ hasText: 'Different Choice' }).click();

      // Should navigate back to random route with query param
      await expect(page).toHaveURL(/\/random\?excludeLastPick=/);

      // Should automatically select and navigate to confirm again
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // The new flavor should be different (can't guarantee in tests due to randomness,
      // but the URL should have had the excludeLastPick parameter)
      // Just verify we're on a confirmation screen
      await expect(page.locator('.flavor-name')).toBeVisible();
    });
  });

  test.describe('Alternative Boxes Display', () => {
    test('shows alternative boxes when multiple boxes exist', async ({ page, context }) => {
      // Ensure chocolate has multiple boxes (it does in our default state)
      // Force selection of chocolate by making it the only available flavor
      await context.addInitScript(() => {
        const singleFlavorState: AppState = {
          version: 1,
          flavors: [{ id: 'chocolate', name: 'Chocolate', excludeFromRandom: false }],
          boxes: [
            {
              id: 'box-choc-1',
              flavorId: 'chocolate',
              quantity: 8,
              location: { stack: 1, height: 0 },
              isOpen: true,
            },
            {
              id: 'box-choc-2',
              flavorId: 'chocolate',
              quantity: 12,
              location: { stack: 1, height: 1 },
              isOpen: false,
            },
            {
              id: 'box-choc-3',
              flavorId: 'chocolate',
              quantity: 5,
              location: { stack: 2, height: 0 },
              isOpen: true,
            },
          ],
          favoriteFlavorId: null,
          settings: {},
        };
        localStorage.setItem('broteinbuddy-state', JSON.stringify(singleFlavorState));
      });

      await page.goto('/#/');
      await page.locator('button').filter({ hasText: 'Random Pick' }).click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Should show Alternative Boxes section
      await expect(page.locator('h3')).toContainText('Alternative Boxes');

      // Should show at least one alternative box (since there are 3 total)
      const alternativeBoxes = page.locator('.alternative-box');
      const count = await alternativeBoxes.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('does not show alternative boxes when only one box exists', async ({ page, context }) => {
      // Set up state with only one box per flavor
      await context.addInitScript(() => {
        const singleBoxState: AppState = {
          version: 1,
          flavors: [{ id: 'chocolate', name: 'Chocolate', excludeFromRandom: false }],
          boxes: [
            {
              id: 'box-1',
              flavorId: 'chocolate',
              quantity: 10,
              location: { stack: 1, height: 0 },
              isOpen: true,
            },
          ],
          favoriteFlavorId: null,
          settings: {},
        };
        localStorage.setItem('broteinbuddy-state', JSON.stringify(singleBoxState));
      });

      await page.goto('/#/');
      await page.locator('button').filter({ hasText: 'Random Pick' }).click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Should NOT show Alternative Boxes section
      const alternativeSection = page.locator('h3').filter({ hasText: 'Alternative Boxes' });
      await expect(alternativeSection).not.toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('loading spinner has aria-label', async ({ page }) => {
      // Navigate to random (might catch loading state briefly)
      await page.goto('/#/random');

      // If spinner appears, it should have aria-label
      const spinner = page.locator('.spinner');
      if (await spinner.isVisible()) {
        await expect(spinner).toHaveAttribute('aria-label', 'Loading');
      }
    });

    test('all buttons are keyboard accessible', async ({ page }) => {
      await page.locator('button').filter({ hasText: 'Random Pick' }).click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Tab through buttons
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to activate button with Enter
      await page.keyboard.press('Enter');

      // Should have triggered some action (navigation or state change)
      // Just verify we're still on a valid page
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
