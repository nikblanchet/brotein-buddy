/**
 * End-to-end tests for the Favorite Flavor Quick-Pick flow
 *
 * Tests the complete favorite quick-pick user journey from home screen
 * directly to confirmation (bypassing random selection).
 *
 * @group e2e
 * @module tests/e2e/favorite-flow
 */

import { test, expect } from '@playwright/test';
import type { AppState } from '../../src/types/models';
import { STORAGE_KEY } from '../../src/lib/storage';

test.describe('Favorite Flavor Quick-Pick Flow', () => {
  test.describe('With Favorite Configured', () => {
    test.beforeEach(async ({ page, context }) => {
      // Set up localStorage with favorite configured
      await context.addInitScript((key) => {
        const testState: AppState = {
          version: 1,
          flavors: [
            { id: 'chocolate', name: 'Chocolate', excludeFromRandom: false },
            { id: 'vanilla', name: 'Vanilla', excludeFromRandom: false },
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
          ],
          favoriteFlavorId: 'chocolate',
          settings: {},
        };
        localStorage.setItem(key, JSON.stringify(testState));
      }, STORAGE_KEY);

      // Navigate to home screen
      await page.goto('/#/');
      await expect(page.locator('h1')).toContainText('BroteinBuddy');
    });

    test('displays favorite flavor name on button', async ({ page }) => {
      const favoriteButton = page.getByTestId('favorite-button');
      await expect(favoriteButton).toContainText('Chocolate');
    });

    test('button is enabled when favorite is configured', async ({ page }) => {
      const favoriteButton = page.getByTestId('favorite-button');
      await expect(favoriteButton).toBeEnabled();
    });

    test('navigates directly to confirmation when favorite button clicked', async ({ page }) => {
      const favoriteButton = page.getByTestId('favorite-button');
      await favoriteButton.click();

      // Should navigate directly to confirmation (NOT random selection)
      await expect(page).toHaveURL(/#\/random\/confirm/);

      // Should show favorite flavor name
      await expect(page.locator('h1')).toContainText('Chocolate');
    });

    test('skips random selection step entirely', async ({ page }) => {
      const favoriteButton = page.getByTestId('favorite-button');
      await favoriteButton.click();

      // Should never see random selection screen
      // Should go directly to confirm
      await page.waitForTimeout(500); // Wait to ensure no redirect through /random
      await expect(page).toHaveURL(/#\/random\/confirm/);
    });

    test('completes full favorite flow: home -> confirm -> confirm action', async ({ page }) => {
      // Start from home
      await expect(page.locator('h1')).toContainText('BroteinBuddy');

      // Click favorite button
      await page.getByTestId('favorite-button').click();

      // Should be on confirmation with correct flavor
      await expect(page).toHaveURL(/#\/random\/confirm/);
      await expect(page.locator('h1')).toContainText('Chocolate');

      // Confirm selection
      await page.locator('button').filter({ hasText: 'Confirm' }).first().click();

      // Should navigate back to home
      await expect(page).toHaveURL(/#\/$/);
      await expect(page.locator('h1')).toContainText('BroteinBuddy');
    });

    test('favorite button shows correct flavor after state change', async ({ page, context }) => {
      // Initial favorite is Chocolate
      const favoriteButton = page.getByTestId('favorite-button');
      await expect(favoriteButton).toContainText('Chocolate');

      // Change favorite to Vanilla
      await context.addInitScript((key) => {
        const newState: AppState = {
          version: 1,
          flavors: [
            { id: 'chocolate', name: 'Chocolate', excludeFromRandom: false },
            { id: 'vanilla', name: 'Vanilla', excludeFromRandom: false },
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
          ],
          favoriteFlavorId: 'vanilla',
          settings: {},
        };
        localStorage.setItem(key, JSON.stringify(newState));
      }, STORAGE_KEY);

      await page.reload();
      await expect(page.getByTestId('favorite-button')).toContainText('Vanilla');
    });
  });

  test.describe('Without Favorite Configured', () => {
    test.beforeEach(async ({ page, context }) => {
      // Set up localStorage without favorite
      await context.addInitScript((key) => {
        const testState: AppState = {
          version: 1,
          flavors: [{ id: 'chocolate', name: 'Chocolate', excludeFromRandom: false }],
          boxes: [
            {
              id: 'box-1',
              flavorId: 'chocolate',
              quantity: 5,
              location: { stack: 1, height: 0 },
              isOpen: true,
            },
          ],
          favoriteFlavorId: null,
          settings: {},
        };
        localStorage.setItem(key, JSON.stringify(testState));
      }, STORAGE_KEY);

      await page.goto('/#/');
    });

    test('displays "Set Favorite" text when no favorite configured', async ({ page }) => {
      const favoriteButton = page.getByTestId('favorite-button');
      await expect(favoriteButton).toContainText('Set Favorite');
    });

    test('button is disabled when no favorite configured', async ({ page }) => {
      const favoriteButton = page.getByTestId('favorite-button');
      await expect(favoriteButton).toBeDisabled();
    });

    test('cannot click button when disabled', async ({ page }) => {
      const favoriteButton = page.getByTestId('favorite-button');

      // Attempt to click (should not navigate)
      await favoriteButton.click({ force: true });

      // Should stay on home page
      await expect(page).toHaveURL(/#\/$/);
    });
  });

  test.describe('Edge Cases', () => {
    test('handles favorite flavor that no longer exists', async ({ page, context }) => {
      // Set up with favorite pointing to non-existent flavor
      await context.addInitScript((key) => {
        const testState: AppState = {
          version: 1,
          flavors: [{ id: 'vanilla', name: 'Vanilla', excludeFromRandom: false }],
          boxes: [
            {
              id: 'box-1',
              flavorId: 'vanilla',
              quantity: 5,
              location: { stack: 1, height: 0 },
              isOpen: true,
            },
          ],
          favoriteFlavorId: 'chocolate', // Does not exist
          settings: {},
        };
        localStorage.setItem(key, JSON.stringify(testState));
      }, STORAGE_KEY);

      await page.goto('/#/');

      // Button should show "Set Favorite" since flavor not found
      const favoriteButton = page.getByTestId('favorite-button');
      await expect(favoriteButton).toContainText('Set Favorite');
      await expect(favoriteButton).toBeDisabled();
    });

    test('handles favorite flavor with no boxes', async ({ page, context }) => {
      await context.addInitScript((key) => {
        const testState: AppState = {
          version: 1,
          flavors: [{ id: 'chocolate', name: 'Chocolate', excludeFromRandom: false }],
          boxes: [], // No boxes
          favoriteFlavorId: 'chocolate',
          settings: {},
        };
        localStorage.setItem(key, JSON.stringify(testState));
      }, STORAGE_KEY);

      await page.goto('/#/');

      // Button should show and be enabled
      const favoriteButton = page.getByTestId('favorite-button');
      await expect(favoriteButton).toContainText('Chocolate');
      await expect(favoriteButton).toBeEnabled();

      // Click should navigate to confirm
      await favoriteButton.click();
      await expect(page).toHaveURL(/#\/random\/confirm/);

      // Confirmation should show error about no boxes
      await expect(page.locator('h1')).toContainText('Unable to Confirm');
    });
  });
});
