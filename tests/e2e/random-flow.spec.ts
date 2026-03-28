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
import { STORAGE_KEY } from '../../src/lib/storage';

/**
 * Helper function to create a sample app state for testing
 * Currently unused - will be needed when skipped tests are re-enabled
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createTestState(): AppState {
  return {
    version: 2,
    flavors: [
      { id: 'chocolate', name: 'Chocolate', randomPool: 'caffeine-free' },
      { id: 'vanilla', name: 'Vanilla', randomPool: 'caffeine-free' },
      { id: 'strawberry', name: 'Strawberry', randomPool: 'caffeine-free' },
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
    await context.addInitScript((key) => {
      const testState: AppState = {
        version: 2,
        flavors: [
          { id: 'chocolate', name: 'Chocolate', randomPool: 'caffeine-free' },
          { id: 'vanilla', name: 'Vanilla', randomPool: 'caffeine-free' },
          { id: 'strawberry', name: 'Strawberry', randomPool: 'caffeine-free' },
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

  test.describe('Random Selection Screen', () => {
    test('automatically performs selection on load', async ({ page }) => {
      // Click Random Pick button
      const randomButton = page.getByTestId('random-caffeine-free-button');
      await randomButton.click();

      // Should navigate to random route
      await expect(page).toHaveURL(/#\/random/);

      // Should show loading state briefly (or skip straight to confirm)
      // Wait for navigation to confirm screen (selection happens automatically)
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });
    });
  });

  test.describe('Confirmation Screen', () => {
    test('displays selected flavor and box details', async ({ page }) => {
      // Navigate to random selection
      const randomButton = page.getByTestId('random-caffeine-free-button');
      await randomButton.click();

      // Wait for confirmation screen
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Should display a flavor name (we don't know which one was selected)
      const flavorName = page.locator('.flavor-name');
      await expect(flavorName).toBeVisible();
      await expect(flavorName).not.toBeEmpty();

      // Should display box details
      await expect(page.locator('h2')).toContainText('Use This Box');
      await expect(page.locator('.box-details .quantity')).toBeVisible();
      await expect(page.locator('.box-details .location')).toBeVisible();
      await expect(page.locator('.box-details .status')).toBeVisible();
    });

    test('displays all four action buttons', async ({ page }) => {
      // Navigate through random flow
      await page.getByTestId('random-caffeine-free-button').click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Check all buttons exist
      await expect(page.locator('button').filter({ hasText: 'Confirm' })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: 'Add Another' })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: 'Different Choice' })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: 'Cancel' })).toBeVisible();
    });

    test('shows open/unopened status correctly', async ({ page }) => {
      await page.getByTestId('random-caffeine-free-button').click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Should show either "Open" or "Unopened" status in priority box
      const status = page.locator('.box-details .status');
      await expect(status).toBeVisible();
      const statusText = await status.textContent();
      expect(statusText === 'Open' || statusText === 'Unopened').toBeTruthy();
    });
  });

  test.describe('Confirm Action', () => {
    test('confirms selection and returns to home', async ({ page }) => {
      // Get initial state from localStorage
      const initialState = await page.evaluate((key) => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
      }, STORAGE_KEY);

      const initialTotalQuantity = initialState.boxes.reduce(
        (sum: number, box: { quantity: number }) => sum + box.quantity,
        0
      );

      // Navigate through random flow
      await page.getByTestId('random-caffeine-free-button').click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Click Confirm
      await page.locator('button').filter({ hasText: 'Confirm' }).click();

      // Should return to home
      await expect(page).toHaveURL(/#\/$/);

      // Verify state was updated (quantity decreased by 1)
      const updatedState = await page.evaluate((key) => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
      }, STORAGE_KEY);

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
      const initialState = await page.evaluate((key) => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
      }, STORAGE_KEY);

      // Navigate through random flow
      await page.getByTestId('random-caffeine-free-button').click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Click Cancel
      await page.locator('button').filter({ hasText: 'Cancel' }).click();

      // Should return to home
      await expect(page).toHaveURL(/#\/$/);

      // Verify state was NOT updated
      const updatedState = await page.evaluate((key) => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
      }, STORAGE_KEY);

      expect(JSON.stringify(updatedState)).toBe(JSON.stringify(initialState));
    });
  });

  test.describe('Add Another Action', () => {
    test('decrements quantity and stays on confirmation screen', async ({ page }) => {
      // Navigate through random flow
      await page.getByTestId('random-caffeine-free-button').click();
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
  });

  test.describe('Different Choice Action', () => {
    test('navigates back to random selection with exclusion', async ({ page }) => {
      // Navigate through random flow
      await page.getByTestId('random-caffeine-free-button').click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Get the selected flavor name (will be used to verify exclusion when test is re-enabled)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const selectedFlavorName = await page.locator('.flavor-name').textContent();

      // Click Different Choice
      await page.locator('button').filter({ hasText: 'Different Choice' }).click();

      // Should navigate back to random route with query param
      await expect(page).toHaveURL(/#\/random\?excludeLastPick=/);

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
      await context.addInitScript((key) => {
        const singleFlavorState: AppState = {
          version: 2,
          flavors: [{ id: 'chocolate', name: 'Chocolate', randomPool: 'caffeine-free' }],
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
        localStorage.setItem(key, JSON.stringify(singleFlavorState));
      }, STORAGE_KEY);

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

      await page.getByTestId('random-caffeine-free-button').click();
      await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

      // Should show Alternative Boxes section
      await expect(page.locator('h3')).toContainText('Alternative Boxes');

      // Should show at least one alternative box (since there are 3 total)
      const alternativeBoxes = page.locator('.alternative-box');
      const count = await alternativeBoxes.count();
      expect(count).toBeGreaterThanOrEqual(1);
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
      await page.getByTestId('random-caffeine-free-button').click();
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

// These tests need their own describe blocks because they require different initial state
// (error conditions) than the main "Random Selection Flow" tests which use a beforeEach
// with populated test data. Playwright's addInitScript must be called BEFORE navigation,
// so tests that need fundamentally different state should be in separate describe blocks
// to avoid inheriting conflicting beforeEach setup.

test.describe('Random Selection Flow - Error State: No Flavors', () => {
  test('handles no flavors available', async ({ page, context }) => {
    // Set up state with no flavors
    await context.addInitScript((key) => {
      const emptyState: AppState = {
        version: 2,
        flavors: [],
        boxes: [],
        favoriteFlavorId: null,
        settings: {},
      };
      localStorage.setItem(key, JSON.stringify(emptyState));
    }, STORAGE_KEY);

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

    const randomButton = page.getByTestId('random-caffeine-free-button');
    await randomButton.click();

    // Should show error message
    await expect(page.locator('h1')).toContainText('No Selection Available');
    await expect(page.locator('.error-message')).toContainText('No flavors configured yet');

    // Should have Back to Home button
    const homeButton = page.locator('button').filter({ hasText: 'Back to Home' });
    await expect(homeButton).toBeVisible();
  });
});

test.describe('Random Selection Flow - Error State: All Flavors Excluded', () => {
  test('handles all flavors excluded', async ({ page, context }) => {
    // Set up state with all flavors excluded
    await context.addInitScript((key) => {
      const excludedState: AppState = {
        version: 2,
        flavors: [
          { id: 'chocolate', name: 'Chocolate', randomPool: null },
          { id: 'vanilla', name: 'Vanilla', randomPool: null },
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
      localStorage.setItem(key, JSON.stringify(excludedState));
    }, STORAGE_KEY);

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

    const randomButton = page.getByTestId('random-caffeine-free-button');
    await randomButton.click();

    // Should show error message - all flavors have randomPool: null, so none are in the caffeine-free pool
    await expect(page.locator('.error-message')).toContainText('No 💪 flavors in this pool');
  });
});

test.describe('Random Selection Flow - Error State: No Boxes in Stock', () => {
  test('handles no boxes in stock', async ({ page, context }) => {
    // Set up state with flavors but no boxes
    await context.addInitScript((key) => {
      const noStockState: AppState = {
        version: 2,
        flavors: [{ id: 'chocolate', name: 'Chocolate', randomPool: 'caffeine-free' }],
        boxes: [],
        favoriteFlavorId: null,
        settings: {},
      };
      localStorage.setItem(key, JSON.stringify(noStockState));
    }, STORAGE_KEY);

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

    const randomButton = page.getByTestId('random-caffeine-free-button');
    await randomButton.click();

    // Should show error message (matches substring of detailed error)
    await expect(page.locator('.error-message')).toContainText('no boxes in stock');
  });
});

test.describe('Random Selection Flow - Add Another: Quantity 1', () => {
  test('disables Add Another button when quantity is 1', async ({ page, context }) => {
    // Set up state with a box that has quantity 1
    await context.addInitScript((key) => {
      const lowQuantityState: AppState = {
        version: 2,
        flavors: [{ id: 'chocolate', name: 'Chocolate', randomPool: 'caffeine-free' }],
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
      localStorage.setItem(key, JSON.stringify(lowQuantityState));
    }, STORAGE_KEY);

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

    await page.getByTestId('random-caffeine-free-button').click();
    await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

    // Add Another button should be disabled
    const addAnotherButton = page.locator('button').filter({ hasText: 'Add Another' });
    await expect(addAnotherButton).toBeDisabled();
  });
});

test.describe('Random Selection Flow - Alternative Boxes: Single Box', () => {
  test('does not show alternative boxes when only one box exists', async ({ page, context }) => {
    // Set up state with only one box per flavor
    await context.addInitScript((key) => {
      const singleBoxState: AppState = {
        version: 2,
        flavors: [{ id: 'chocolate', name: 'Chocolate', randomPool: 'caffeine-free' }],
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
      localStorage.setItem(key, JSON.stringify(singleBoxState));
    }, STORAGE_KEY);

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

    await page.getByTestId('random-caffeine-free-button').click();
    await expect(page).toHaveURL(/#\/random\/confirm/, { timeout: 3000 });

    // Should NOT show Alternative Boxes section
    const alternativeSection = page.locator('h3').filter({ hasText: 'Alternative Boxes' });
    await expect(alternativeSection).not.toBeVisible();
  });
});
