/**
 * End-to-end tests for the Inventory Management screen
 *
 * Tests the inventory screen rendering, view toggling, sorting, navigation,
 * and integration with application state for box and flavor management.
 *
 * @group e2e
 * @module tests/e2e/inventory
 */

import { test, expect } from '@playwright/test';
import type { AppState } from '../../src/types/models';

/**
 * Helper function to create a test app state with boxes and flavors
 */
function createTestState(): AppState {
  return {
    version: 1,
    boxes: [
      {
        id: 'box_1',
        flavorId: 'flavor_chocolate',
        quantity: 12,
        location: { stack: 1, height: 0 },
        isOpen: false,
      },
      {
        id: 'box_2',
        flavorId: 'flavor_vanilla',
        quantity: 8,
        location: { stack: 1, height: 1 },
        isOpen: true,
      },
      {
        id: 'box_3',
        flavorId: 'flavor_strawberry',
        quantity: 15,
        location: { stack: 2, height: 0 },
        isOpen: false,
      },
    ],
    flavors: [
      { id: 'flavor_chocolate', name: 'Chocolate', excludeFromRandom: false },
      { id: 'flavor_vanilla', name: 'Vanilla', excludeFromRandom: false },
      { id: 'flavor_strawberry', name: 'Strawberry', excludeFromRandom: false },
      { id: 'flavor_caramel', name: 'Caramel', excludeFromRandom: false }, // Out of stock
    ],
    favoriteFlavorId: null,
    settings: {},
  };
}

test.describe('Inventory Screen', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up test state with boxes and flavors
    await context.addInitScript(() => {
      const state = {
        version: 1,
        boxes: [
          {
            id: 'box_1',
            flavorId: 'flavor_chocolate',
            quantity: 12,
            location: { stack: 1, height: 0 },
            isOpen: false,
          },
          {
            id: 'box_2',
            flavorId: 'flavor_vanilla',
            quantity: 8,
            location: { stack: 1, height: 1 },
            isOpen: true,
          },
          {
            id: 'box_3',
            flavorId: 'flavor_strawberry',
            quantity: 15,
            location: { stack: 2, height: 0 },
            isOpen: false,
          },
        ],
        flavors: [
          { id: 'flavor_chocolate', name: 'Chocolate', excludeFromRandom: false },
          { id: 'flavor_vanilla', name: 'Vanilla', excludeFromRandom: false },
          { id: 'flavor_strawberry', name: 'Strawberry', excludeFromRandom: false },
          { id: 'flavor_caramel', name: 'Caramel', excludeFromRandom: false },
        ],
        favoriteFlavorId: null,
        settings: {},
      };
      localStorage.setItem('brotein-buddy-state', JSON.stringify(state));
    });

    // Navigate to inventory screen
    await page.goto('/#/inventory');

    // Wait for inventory screen to be fully loaded
    await expect(page.locator('h1')).toContainText('Inventory');
  });

  test.describe('Basic Rendering', () => {
    test('renders inventory screen title', async ({ page }) => {
      const title = page.locator('h1');
      await expect(title).toBeVisible();
      await expect(title).toHaveText('Inventory');
    });

    test('renders control buttons', async ({ page }) => {
      // Should have View toggle, Rearrange, and New Flavor buttons
      const viewToggleButton = page.locator('button').filter({ hasText: 'View:' });
      const rearrangeButton = page.locator('button').filter({ hasText: 'Rearrange' });
      const newFlavorButton = page.locator('button').filter({ hasText: 'New Flavor' });

      await expect(viewToggleButton).toBeVisible();
      await expect(rearrangeButton).toBeVisible();
      await expect(newFlavorButton).toBeVisible();
    });

    test('shows visual view by default', async ({ page }) => {
      const viewToggleButton = page.locator('button').filter({ hasText: 'View:' });
      await expect(viewToggleButton).toContainText('Visual');

      // Visual view should be visible
      const visualView = page.locator('.visual-view');
      await expect(visualView).toBeVisible();
    });
  });

  test.describe('Visual View', () => {
    test('displays boxes grouped by stack', async ({ page }) => {
      // Check for stack containers
      const stacks = page.locator('.stack');
      await expect(stacks).toHaveCount(2); // Stack 1 and Stack 2

      // Verify stack labels
      await expect(stacks.nth(0)).toContainText('Stack 1');
      await expect(stacks.nth(1)).toContainText('Stack 2');
    });

    test('displays boxes with correct information', async ({ page }) => {
      // Find a specific box
      const chocolateBox = page.locator('.box-visual').filter({ hasText: 'Chocolate' });

      await expect(chocolateBox).toBeVisible();
      await expect(chocolateBox).toContainText('12 bottles');
    });

    test('shows open status on opened boxes', async ({ page }) => {
      const vanillaBox = page.locator('.box-visual').filter({ hasText: 'Vanilla' });

      await expect(vanillaBox).toContainText('Open');
    });

    test('displays out-of-stock section', async ({ page }) => {
      // Check for out-of-stock section
      const outOfStockSection = page.locator('.out-of-stock-section');
      await expect(outOfStockSection).toBeVisible();
      await expect(outOfStockSection).toContainText('Out of Stock');

      // Caramel flavor should be listed (zero inventory)
      await expect(outOfStockSection).toContainText('Caramel');
    });

    test('boxes are clickable and navigate to edit screen', async ({ page }) => {
      const chocolateBox = page.locator('.box-visual').filter({ hasText: 'Chocolate' });

      await chocolateBox.click();

      // Should navigate to box edit screen
      await expect(page).toHaveURL(/#\/inventory\/box_1\/edit/);
    });

    test('boxes have color-coded backgrounds', async ({ page }) => {
      const chocolateBox = page.locator('.box-visual').filter({ hasText: 'Chocolate' });

      // Should have inline background-color style
      const bgColor = await chocolateBox.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Should have some color (not transparent or white)
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(bgColor).not.toBe('rgb(255, 255, 255)');
    });
  });

  test.describe('Table View', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to table view
      const viewToggleButton = page.locator('button').filter({ hasText: 'View:' });
      await viewToggleButton.click();

      // Wait for table to be visible
      await expect(page.locator('.inventory-table')).toBeVisible();
    });

    test('displays table with correct columns', async ({ page }) => {
      // Check table headers
      const headers = page.locator('.inventory-table th');
      await expect(headers).toHaveCount(3);

      await expect(headers.nth(0)).toContainText('Flavor');
      await expect(headers.nth(1)).toContainText('Quantity');
      await expect(headers.nth(2)).toContainText('Location');
    });

    test('displays all boxes in table', async ({ page }) => {
      const rows = page.locator('.inventory-table tbody tr');
      await expect(rows).toHaveCount(3); // 3 boxes in test state
    });

    test('displays correct box information in table', async ({ page }) => {
      // Find row with Chocolate flavor
      const chocolateRow = page
        .locator('.inventory-table tbody tr')
        .filter({ hasText: 'Chocolate' });

      await expect(chocolateRow).toContainText('12'); // quantity
      await expect(chocolateRow).toContainText('Stack 1, Height 0');
    });

    test('shows Open badge for opened boxes', async ({ page }) => {
      const vanillaRow = page.locator('.inventory-table tbody tr').filter({ hasText: 'Vanilla' });

      await expect(vanillaRow).toContainText('Open');
    });

    test('table rows are clickable', async ({ page }) => {
      const chocolateRow = page
        .locator('.inventory-table tbody tr')
        .filter({ hasText: 'Chocolate' });

      await chocolateRow.click();

      // Should navigate to box edit screen
      await expect(page).toHaveURL(/#\/inventory\/box_1\/edit/);
    });

    test('sorts by flavor when flavor header clicked', async ({ page }) => {
      const flavorHeader = page.locator('.inventory-table th').filter({ hasText: 'Flavor' });

      // Click to sort ascending
      await flavorHeader.click();

      // Check sort indicator
      await expect(flavorHeader).toContainText('↑');

      // Verify order (alphabetical ascending)
      const rows = page.locator('.inventory-table tbody tr');
      await expect(rows.nth(0)).toContainText('Chocolate');
      await expect(rows.nth(1)).toContainText('Strawberry');
      await expect(rows.nth(2)).toContainText('Vanilla');
    });

    test('toggles sort direction when same header clicked twice', async ({ page }) => {
      const flavorHeader = page.locator('.inventory-table th').filter({ hasText: 'Flavor' });

      // Click once for ascending
      await flavorHeader.click();
      await expect(flavorHeader).toContainText('↑');

      // Click again for descending
      await flavorHeader.click();
      await expect(flavorHeader).toContainText('↓');

      // Verify order (alphabetical descending)
      const rows = page.locator('.inventory-table tbody tr');
      await expect(rows.nth(0)).toContainText('Vanilla');
      await expect(rows.nth(1)).toContainText('Strawberry');
      await expect(rows.nth(2)).toContainText('Chocolate');
    });

    test('sorts by quantity', async ({ page }) => {
      const quantityHeader = page.locator('.inventory-table th').filter({ hasText: 'Quantity' });

      await quantityHeader.click();

      // Verify order (quantity ascending: 8, 12, 15)
      const rows = page.locator('.inventory-table tbody tr');
      await expect(rows.nth(0)).toContainText('Vanilla'); // 8
      await expect(rows.nth(1)).toContainText('Chocolate'); // 12
      await expect(rows.nth(2)).toContainText('Strawberry'); // 15
    });

    test('sorts by location', async ({ page }) => {
      const locationHeader = page.locator('.inventory-table th').filter({ hasText: 'Location' });

      await locationHeader.click();

      // Verify order (by stack then height)
      const rows = page.locator('.inventory-table tbody tr');
      await expect(rows.nth(0)).toContainText('Stack 1, Height 0'); // Chocolate
      await expect(rows.nth(1)).toContainText('Stack 1, Height 1'); // Vanilla
      await expect(rows.nth(2)).toContainText('Stack 2, Height 0'); // Strawberry
    });
  });

  test.describe('View Toggling', () => {
    test('toggles from visual to table view', async ({ page }) => {
      // Initially in visual view
      await expect(page.locator('.visual-view')).toBeVisible();

      // Click toggle button
      const viewToggleButton = page.locator('button').filter({ hasText: 'View:' });
      await viewToggleButton.click();

      // Should now show table view
      await expect(page.locator('.inventory-table')).toBeVisible();
      await expect(viewToggleButton).toContainText('Table');
    });

    test('toggles from table back to visual view', async ({ page }) => {
      // Switch to table view
      const viewToggleButton = page.locator('button').filter({ hasText: 'View:' });
      await viewToggleButton.click();
      await expect(page.locator('.inventory-table')).toBeVisible();

      // Toggle back to visual
      await viewToggleButton.click();

      // Should show visual view again
      await expect(page.locator('.visual-view')).toBeVisible();
      await expect(viewToggleButton).toContainText('Visual');
    });
  });

  test.describe('Navigation', () => {
    test('navigates to rearrange screen when button clicked', async ({ page }) => {
      const rearrangeButton = page.locator('button').filter({ hasText: 'Rearrange' });

      await rearrangeButton.click();

      await expect(page).toHaveURL(/#\/inventory\/rearrange/);
    });
  });

  test.describe('New Flavor Modal', () => {
    test('opens modal when New Flavor button clicked', async ({ page }) => {
      const newFlavorButton = page.locator('button').filter({ hasText: 'New Flavor' });

      await newFlavorButton.click();

      // Modal should be visible
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText('Add New Flavor');
    });

    test('modal has flavor name input and checkbox', async ({ page }) => {
      // Open modal
      await page.locator('button').filter({ hasText: 'New Flavor' }).click();

      // Check for input field
      const nameInput = page.locator('#flavor-name');
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toHaveAttribute('placeholder', 'Enter flavor name');

      // Check for checkbox
      const checkbox = page.locator('input[type="checkbox"]');
      await expect(checkbox).toBeVisible();
    });

    test('Save button is disabled when name is empty', async ({ page }) => {
      // Open modal
      await page.locator('button').filter({ hasText: 'New Flavor' }).click();

      // Save button should be disabled initially
      const saveButton = page.locator('button').filter({ hasText: 'Save' });
      await expect(saveButton).toBeDisabled();
    });

    test('can add a new flavor', async ({ page }) => {
      // Open modal
      await page.locator('button').filter({ hasText: 'New Flavor' }).click();

      // Fill in flavor name
      const nameInput = page.locator('#flavor-name');
      await nameInput.fill('Cookies and Cream');

      // Save button should now be enabled
      const saveButton = page.locator('button').filter({ hasText: 'Save' });
      await expect(saveButton).toBeEnabled();

      // Click save
      await saveButton.click();

      // Modal should close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();

      // New flavor should appear in out-of-stock section (zero boxes)
      await expect(page.locator('.out-of-stock-section')).toContainText('Cookies and Cream');
    });

    test('closes modal when Cancel clicked', async ({ page }) => {
      // Open modal
      await page.locator('button').filter({ hasText: 'New Flavor' }).click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Click cancel
      const cancelButton = page.locator('button').filter({ hasText: 'Cancel' });
      await cancelButton.click();

      // Modal should close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test('shows empty state when no boxes exist', async ({ page, context }) => {
      // Set up state with no boxes
      await context.addInitScript(() => {
        const state = {
          version: 1,
          boxes: [],
          flavors: [],
          favoriteFlavorId: null,
          settings: {},
        };
        localStorage.setItem('brotein-buddy-state', JSON.stringify(state));
      });

      await page.goto('/#/inventory');

      // Should show empty state message
      await expect(page.locator('.empty-state')).toBeVisible();
      await expect(page.locator('.empty-state')).toContainText('No boxes in inventory');
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('can navigate to boxes using keyboard in visual view', async ({ page }) => {
      // Focus first box
      const firstBox = page.locator('.box-visual').first();
      await firstBox.focus();

      // Should be focusable
      await expect(firstBox).toBeFocused();

      // Press Enter to navigate
      await page.keyboard.press('Enter');

      // Should navigate to edit screen
      await expect(page).toHaveURL(/\/edit/);
    });

    test('can activate box with Space key', async ({ page }) => {
      const firstBox = page.locator('.box-visual').first();
      await firstBox.focus();

      // Press Space
      await page.keyboard.press('Space');

      // Should navigate to edit screen
      await expect(page).toHaveURL(/\/edit/);
    });

    test('can tab through boxes in visual view', async ({ page }) => {
      // Tab to first box
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Past the control buttons

      // Should be on a box
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveClass(/box-visual/);
    });
  });

  test.describe('Accessibility', () => {
    test('control buttons have sufficient touch targets', async ({ page }) => {
      const buttons = page.locator('.controls button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const bbox = await buttons.nth(i).boundingBox();
        expect(bbox?.height).toBeGreaterThanOrEqual(40); // Minimum touch target
        expect(bbox?.width).toBeGreaterThanOrEqual(40);
      }
    });

    test('visual boxes have sufficient touch targets', async ({ page }) => {
      const boxes = page.locator('.box-visual');
      const count = await boxes.count();

      for (let i = 0; i < count; i++) {
        const bbox = await boxes.nth(i).boundingBox();
        expect(bbox?.height).toBeGreaterThanOrEqual(44); // Recommended touch target
      }
    });

    test('boxes have role and tabindex for accessibility', async ({ page }) => {
      const firstBox = page.locator('.box-visual').first();

      await expect(firstBox).toHaveAttribute('role', 'button');
      await expect(firstBox).toHaveAttribute('tabindex', '0');
    });
  });

  test.describe('Responsive Layout', () => {
    test('renders correctly on mobile (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Title should be visible
      await expect(page.locator('h1')).toBeVisible();

      // Buttons should stack vertically
      const controls = page.locator('.controls');
      await expect(controls).toBeVisible();
    });

    test('renders correctly on tablet (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.stacks-container')).toBeVisible();
    });

    test('renders correctly on desktop (1024px)', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });

      await expect(page.locator('h1')).toBeVisible();

      // Header should be horizontal on desktop
      const header = page.locator('.inventory-header');
      await expect(header).toBeVisible();
    });
  });
});
