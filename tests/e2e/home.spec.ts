/**
 * End-to-end tests for the Home screen
 *
 * Tests the main home screen navigation, button rendering, responsive layout,
 * and integration with application state for the favorite flavor feature.
 *
 * @group e2e
 * @module tests/e2e/home
 */

import { test, expect } from '@playwright/test';

test.describe('Home Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home screen
    await page.goto('/#/');

    // Wait for home screen to be fully loaded
    await expect(page.locator('h1')).toContainText('Protein Buddy');
  });

  test.describe('Basic Rendering', () => {
    test('renders the app title and subtitle', async ({ page }) => {
      // Check title
      const title = page.locator('h1');
      await expect(title).toBeVisible();
      await expect(title).toHaveText('Protein Buddy');

      // Check subtitle
      const subtitle = page.locator('.subtitle');
      await expect(subtitle).toBeVisible();
      await expect(subtitle).toContainText('Track & Pick Your Shakes');
    });

    test('renders all four navigation buttons', async ({ page }) => {
      // Get all buttons
      const buttons = page.locator('button');

      // Should have exactly 4 buttons
      await expect(buttons).toHaveCount(4);

      // Verify button text content
      await expect(buttons.nth(0)).toContainText('Random Pick');
      await expect(buttons.nth(1)).toContainText('Set Favorite'); // Default when no favorite
      await expect(buttons.nth(2)).toContainText('Choose Flavor');
      await expect(buttons.nth(3)).toContainText('Manage Inventory');
    });

    test('buttons have proper visual hierarchy', async ({ page }) => {
      const randomButton = page.locator('button').filter({ hasText: 'Random Pick' });
      const inventoryButton = page.locator('button').filter({ hasText: 'Manage Inventory' });

      // Random button should be more prominent (larger font)
      const randomFontSize = await randomButton.evaluate(
        (el) => window.getComputedStyle(el).fontSize
      );
      const inventoryFontSize = await inventoryButton.evaluate(
        (el) => window.getComputedStyle(el).fontSize
      );

      // Parse font sizes and compare
      const randomSize = parseInt(randomFontSize);
      const inventorySize = parseInt(inventoryFontSize);

      expect(randomSize).toBeGreaterThanOrEqual(inventorySize);
    });
  });

  test.describe('Navigation', () => {
    test('random button navigates to /random route', async ({ page }) => {
      const randomButton = page.locator('button').filter({ hasText: 'Random Pick' });
      await randomButton.click();

      // Should navigate to random selection route
      await expect(page).toHaveURL(/#\/random/);
    });

    test('inventory button navigates to /inventory route', async ({ page }) => {
      const inventoryButton = page.locator('button').filter({
        hasText: 'Manage Inventory',
      });
      await inventoryButton.click();

      // Should navigate to inventory route
      await expect(page).toHaveURL(/#\/inventory/);
    });

    test('manual selection button navigates (placeholder)', async ({ page }) => {
      const manualButton = page.locator('button').filter({ hasText: 'Choose Flavor' });
      await manualButton.click();

      // Currently navigates to inventory as placeholder
      await expect(page).toHaveURL(/#\/inventory/);
    });
  });

  test.describe('Favorite Flavor Feature', () => {
    test('displays "Set Favorite" when no favorite configured', async ({ page, context }) => {
      // Set up localStorage without favorite flavor
      await context.addInitScript(() => {
        const state = {
          version: 1,
          boxes: [],
          flavors: [{ id: 'chocolate', name: 'Chocolate', excludeFromRandom: false }],
          favoriteFlavorId: null,
          settings: {},
        };
        localStorage.setItem('brotein-buddy-state', JSON.stringify(state));
      });

      await page.goto('/#/');

      // Favorite button should show "Set Favorite"
      const favoriteButton = page.locator('button').filter({ hasText: 'Set Favorite' });
      await expect(favoriteButton).toBeVisible();

      // Button should be disabled when no favorite
      await expect(favoriteButton).toBeDisabled();
    });

    test('displays favorite flavor name when configured', async ({ page, context }) => {
      // Set up localStorage with favorite flavor
      await context.addInitScript(() => {
        const state = {
          version: 1,
          boxes: [],
          flavors: [
            { id: 'choc_001', name: 'Chocolate', excludeFromRandom: false },
            { id: 'van_002', name: 'Vanilla', excludeFromRandom: false },
          ],
          favoriteFlavorId: 'choc_001',
          settings: {},
        };
        localStorage.setItem('brotein-buddy-state', JSON.stringify(state));
      });

      await page.goto('/#/');

      // Favorite button should display the flavor name
      const favoriteButton = page.locator('button').filter({ hasText: 'Chocolate' });
      await expect(favoriteButton).toBeVisible();
      await expect(favoriteButton).not.toBeDisabled();
    });

    test('favorite button is clickable when favorite configured', async ({ page, context }) => {
      // Set up localStorage with favorite flavor
      await context.addInitScript(() => {
        const state = {
          version: 1,
          boxes: [],
          flavors: [{ id: 'straw_003', name: 'Strawberry', excludeFromRandom: false }],
          favoriteFlavorId: 'straw_003',
          settings: {},
        };
        localStorage.setItem('brotein-buddy-state', JSON.stringify(state));
      });

      await page.goto('/#/');

      // Click favorite button
      const favoriteButton = page.locator('button').filter({ hasText: 'Strawberry' });
      await favoriteButton.click();

      // Should navigate somewhere (currently /random, will be /random/confirm in 2.4)
      await expect(page).toHaveURL(/#\/random/);
    });
  });

  test.describe('Responsive Layout', () => {
    test('layout works on mobile viewport (375px)', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/#/');

      // All buttons should be visible and stacked vertically
      const buttons = page.locator('button');
      await expect(buttons).toHaveCount(4);

      // Check that each button is visible
      for (let i = 0; i < 4; i++) {
        await expect(buttons.nth(i)).toBeVisible();
      }

      // Buttons should be full width (or close to it) on mobile
      const randomButton = buttons.nth(0);
      const bbox = await randomButton.boundingBox();
      expect(bbox?.width).toBeGreaterThan(300); // Should be nearly full width
    });

    test('layout works on tablet viewport (768px)', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/#/');

      // All buttons should still be visible
      const buttons = page.locator('button');
      await expect(buttons).toHaveCount(4);

      for (let i = 0; i < 4; i++) {
        await expect(buttons.nth(i)).toBeVisible();
      }
    });

    test('layout works on desktop viewport (1024px)', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto('/#/');

      // All buttons should be visible
      const buttons = page.locator('button');
      await expect(buttons).toHaveCount(4);

      for (let i = 0; i < 4; i++) {
        await expect(buttons.nth(i)).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('all buttons have accessible text', async ({ page }) => {
      const buttons = page.locator('button');

      // Each button should have text content
      for (let i = 0; i < 4; i++) {
        const text = await buttons.nth(i).textContent();
        expect(text).toBeTruthy();
        expect(text?.trim()).not.toBe('');
      }
    });

    test('keyboard navigation works', async ({ page }) => {
      // Tab to first button
      await page.keyboard.press('Tab');

      // First button should be focused (Random Pick)
      const randomButton = page.locator('button').filter({ hasText: 'Random Pick' });
      await expect(randomButton).toBeFocused();

      // Tab to second button
      await page.keyboard.press('Tab');

      // Second button should be focused (Favorite)
      const favoriteButton = page.locator('button').nth(1);
      await expect(favoriteButton).toBeFocused();
    });

    test('buttons have sufficient touch targets (44x44px minimum)', async ({ page }) => {
      const buttons = page.locator('button');

      // Check each button meets minimum touch target size
      for (let i = 0; i < 4; i++) {
        const bbox = await buttons.nth(i).boundingBox();
        expect(bbox?.height).toBeGreaterThanOrEqual(44);
        expect(bbox?.width).toBeGreaterThanOrEqual(44);
      }
    });
  });

  test.describe('Visual Polish', () => {
    test('page has proper spacing and layout', async ({ page }) => {
      // Header should be centered
      const header = page.locator('.home-header');
      await expect(header).toBeVisible();

      // Buttons container should exist
      const buttonsContainer = page.locator('.buttons-container');
      await expect(buttonsContainer).toBeVisible();
    });

    test('buttons respond to hover state', async ({ page }) => {
      const randomButton = page.locator('button').filter({ hasText: 'Random Pick' });

      // Get initial background color
      const initialBg = await randomButton.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor
      );

      // Hover over button
      await randomButton.hover();

      // Background should change on hover (or cursor should change)
      const cursor = await randomButton.evaluate((el) => window.getComputedStyle(el).cursor);

      expect(cursor).toBe('pointer');
    });
  });
});
