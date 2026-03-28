import { test, expect } from '@playwright/test';
import type { AppState } from '../../src/types/models';

test.describe('Inventory Box Edit Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home and set up test data
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

    // Set up test data via localStorage
    await page.evaluate(() => {
      const testState = {
        version: 2,
        boxes: [
          {
            id: 'box_test_1',
            flavorId: 'flavor_chocolate',
            quantity: 5,
            location: { stack: 1, height: 1 },
            isOpen: false,
          },
          {
            id: 'box_test_2',
            flavorId: 'flavor_vanilla',
            quantity: 3,
            location: { stack: 1, height: 2 },
            isOpen: true,
          },
          {
            id: 'box_test_3',
            flavorId: 'flavor_strawberry',
            quantity: 8,
            location: { stack: 2, height: 1 },
            isOpen: false,
          },
        ],
        flavors: [
          { id: 'flavor_chocolate', name: 'Chocolate', randomPool: 'caffeine-free' },
          { id: 'flavor_vanilla', name: 'Vanilla', randomPool: 'caffeine-free' },
          { id: 'flavor_strawberry', name: 'Strawberry', randomPool: 'caffeine-free' },
        ],
        favoriteFlavorId: null,
        settings: {},
      };
      localStorage.setItem('BROTEINBUDDY_APP_STATE', JSON.stringify(testState));
    });

    // Reload to pick up the new state
    await page.reload();
  });

  test.describe('Navigation and Basic Display', () => {
    test('should navigate from inventory to box edit', async ({ page }) => {
      // Go to inventory
      await page.goto('/#/inventory');
      await expect(page).toHaveURL('/#/inventory');

      // Click on first box
      await page.click('[data-testid="box-box_test_1"]');
      await expect(page).toHaveURL('/#/inventory/box_test_1/edit');

      // Verify box details are displayed
      await expect(page.locator('h1')).toContainText('Edit Box');
      await expect(page.locator('text=Chocolate')).toBeVisible();
      await expect(page.locator('text=Quantity:')).toBeVisible();
      await expect(page.locator('text=5')).toBeVisible();
    });

    test('should display error for invalid box ID', async ({ page }) => {
      await page.goto('/#/inventory/invalid_box_id/edit');

      await expect(page.locator('text=Box Not Found')).toBeVisible();
      await expect(page.locator('text=The box you are looking for does not exist')).toBeVisible();
    });

    test('should display box details correctly', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      // Check all details are present
      await expect(page.locator('text=Chocolate')).toBeVisible();
      await expect(page.locator('text=Quantity:')).toBeVisible();
      await expect(page.locator('text=5')).toBeVisible();
      await expect(page.locator('text=Location:')).toBeVisible();
      await expect(page.locator('text=Stack 1, Height 1')).toBeVisible();
      await expect(page.locator('text=Status:')).toBeVisible();
      await expect(page.locator('text=Closed')).toBeVisible();
    });

    test('should navigate back to inventory when clicking back button', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      await page.click('text=← Back');
      await expect(page).toHaveURL('/#/inventory');
    });
  });

  test.describe('Add Quantity', () => {
    test('should add quantity using NumberPad', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      // Initial quantity is 5
      await expect(page.locator('text=5')).toBeVisible();

      // Click Add Quantity
      await page.click('button:has-text("Add Quantity")');

      // NumberPad modal should be visible
      await expect(page.locator('h2:has-text("Add Quantity")')).toBeVisible();

      // Click 3 on the number pad
      await page.click('button:has-text("3")');

      // Click Confirm
      await page.click('button:has-text("Confirm")');

      // Verify quantity updated to 8
      await expect(page.locator('.value:has-text("8")')).toBeVisible();

      // Verify state persisted
      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes.find((b) => b.id === 'box_test_1')?.quantity).toBe(8);
    });

    test('should not allow quantity to exceed 12', async ({ page }) => {
      await page.goto('/#/inventory/box_test_3/edit');

      // Current quantity is 8
      await expect(page.locator('.value:has-text("8")')).toBeVisible();

      // Try to add 5 (would make it 13)
      await page.click('button:has-text("Add Quantity")');
      await page.click('button:has-text("5")');
      await page.click('button:has-text("Confirm")');

      // Should show error modal
      await expect(page.locator('h2:has-text("Invalid Input")')).toBeVisible();
      await expect(page.locator('text=Quantity cannot exceed 12')).toBeVisible();

      // Dismiss error modal
      await page.click('button:has-text("OK")');

      // Modal should close and quantity should still be 8
      await expect(page.locator('.value:has-text("8")')).toBeVisible();
    });
  });

  test.describe('Remove Quantity', () => {
    test('should remove quantity using NumberPad', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      // Initial quantity is 5
      await expect(page.locator('.value:has-text("5")')).toBeVisible();

      // Click Remove Quantity
      await page.click('button:has-text("Remove Quantity")');

      // Click 2 on the number pad
      await page.click('button:has-text("2")');
      await page.click('text=Confirm');

      // Verify quantity updated to 3
      await expect(page.locator('.value:has-text("3")')).toBeVisible();

      // Verify state persisted
      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes.find((b) => b.id === 'box_test_1')?.quantity).toBe(3);
    });

    test('should show auto-delete prompt when quantity reaches 0', async ({ page }) => {
      await page.goto('/#/inventory/box_test_2/edit');

      // Current quantity is 3
      await page.click('button:has-text("Remove Quantity")');
      await page.click('button:has-text("3")');
      await page.click('button:has-text("Confirm")');

      // Auto-delete prompt should appear
      await expect(page.locator('h2:has-text("Box Empty")')).toBeVisible();
      await expect(page.locator('text=This box now has 0 quantity')).toBeVisible();
      await expect(page.locator('button:has-text("Keep Empty Box")')).toBeVisible();
      await expect(page.locator('button:has-text("Delete Box")').last()).toBeVisible();
    });

    test('should keep empty box when choosing to keep', async ({ page }) => {
      await page.goto('/#/inventory/box_test_2/edit');

      await page.click('button:has-text("Remove Quantity")');
      await page.click('button:has-text("3")');
      await page.click('button:has-text("Confirm")');

      // Click Keep Empty Box
      await page.click('button:has-text("Keep Empty Box")');

      // Should stay on edit screen with quantity 0
      await expect(page).toHaveURL('/#/inventory/box_test_2/edit');
      await expect(page.locator('.value:has-text("0")')).toBeVisible();
    });

    test('should delete box when choosing to delete from auto-prompt', async ({ page }) => {
      await page.goto('/#/inventory/box_test_2/edit');

      await page.click('button:has-text("Remove Quantity")');
      await page.click('button:has-text("3")');
      await page.click('button:has-text("Confirm")');

      // Click Delete Box
      await page.locator('button:has-text("Delete Box")').last().click();

      // Should navigate back to inventory
      await expect(page).toHaveURL('/#/inventory');

      // Box should be removed from state
      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes.find((b) => b.id === 'box_test_2')).toBeUndefined();
    });
  });

  test.describe('Change Location', () => {
    test('should change location without conflict', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      // Current location is Stack 1, Height 1
      await expect(page.locator('text=Stack 1, Height 1')).toBeVisible();

      // Click Change Location
      await page.click('button:has-text("Change Location")');

      // Enter new location (Stack 2, Height 2)
      await page.fill('input#stack', '2');
      await page.fill('input#height', '2');
      await page.click('button:has-text("Confirm")');

      // Verify location updated
      await expect(page.locator('text=Stack 2, Height 2')).toBeVisible();

      // Verify state persisted
      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      const box = state.boxes.find((b) => b.id === 'box_test_1');
      expect(box?.location).toEqual({ stack: 2, height: 2 });
    });

    test('should show error for invalid location (gaps)', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      // Try to move to Stack 5, Height 1 (stack 2,3,4 don't exist - gaps!)
      await page.click('button:has-text("Change Location")');
      await page.fill('input#stack', '5');
      await page.fill('input#height', '1');
      await page.click('button:has-text("Confirm")');

      // Should show validation error
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('text=Stack 5 requires non-empty stack')).toBeVisible();
    });

    test('should show error for height gaps', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      // Try to move to Stack 1, Height 4 (height 3 doesn't exist)
      await page.click('button:has-text("Change Location")');
      await page.fill('input#stack', '1');
      await page.fill('input#height', '4');
      await page.click('button:has-text("Confirm")');

      // Should show validation error (appears inside the modal, wait for it)
      await page.locator('.error-message').waitFor({ state: 'visible', timeout: 5000 });
      await expect(page.locator('.error-message')).toContainText(
        'Height 4 in stack 1 requires height'
      );
    });

    test('should show conflict modal when location is occupied', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      // Try to move to Stack 1, Height 2 (occupied by box_test_2)
      await page.click('button:has-text("Change Location")');
      await page.fill('input#stack', '1');
      await page.fill('input#height', '2');
      await page.click('button:has-text("Confirm")');

      // Conflict modal should appear (wait for animation to complete)
      await page
        .locator('h2#modal-title:has-text("Location Conflict")')
        .waitFor({ state: 'visible', timeout: 10000 });
      await expect(page.locator('h2:has-text("Location Conflict")')).toBeVisible();
      await expect(page.locator('text=Stack 1, Height 2')).toBeVisible();
      await expect(page.locator('text=is occupied by another box')).toBeVisible();
      await expect(page.locator('button:has-text("Swap Locations")')).toBeVisible();
      await expect(page.locator('button:has-text("Displace Box")')).toBeVisible();
    });

    test('should swap locations when choosing swap', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      await page.click('button:has-text("Change Location")');
      await page.fill('input#stack', '1');
      await page.fill('input#height', '2');
      await page.click('button:has-text("Confirm")');

      // Wait for conflict modal to appear and stabilize
      await page
        .locator('h2#modal-title:has-text("Location Conflict")')
        .waitFor({ state: 'visible', timeout: 10000 });

      // Click Swap Locations
      await page.click('button:has-text("Swap Locations")');

      // Verify current box moved to new location
      await expect(page.locator('text=Stack 1, Height 2')).toBeVisible();

      // Verify state: box_test_1 should be at (1,2) and box_test_2 at (1,1)
      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes.find((b) => b.id === 'box_test_1')?.location).toEqual({
        stack: 1,
        height: 2,
      });
      expect(state.boxes.find((b) => b.id === 'box_test_2')?.location).toEqual({
        stack: 1,
        height: 1,
      });
    });

    test('should displace box when choosing displace', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      await page.click('button:has-text("Change Location")');
      await page.fill('input#stack', '1');
      await page.fill('input#height', '2');
      await page.click('button:has-text("Confirm")');

      // Wait for conflict modal to appear and stabilize
      await page
        .locator('h2#modal-title:has-text("Location Conflict")')
        .waitFor({ state: 'visible', timeout: 10000 });

      // Click Displace Box
      await page.click('button:has-text("Displace Box")');

      // Verify current box moved to new location
      await expect(page.locator('text=Stack 1, Height 2')).toBeVisible();

      // Verify state: box_test_2 should be orphaned (0,0)
      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes.find((b) => b.id === 'box_test_2').location).toEqual({
        stack: 0,
        height: 0,
      });
    });
  });

  test.describe('Toggle Open/Closed', () => {
    test('should toggle box from closed to open', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      // Initially closed
      await expect(page.locator('.status-badge.closed')).toBeVisible();
      await expect(page.locator('text=Closed')).toBeVisible();

      // Click toggle
      await page.click('button:has-text("Toggle Open")');

      // Should now be open
      await expect(page.locator('.status-badge.open')).toBeVisible();
      await expect(page.locator('.status-badge:has-text("Open")')).toBeVisible();

      // Verify state persisted
      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes.find((b) => b.id === 'box_test_1')?.isOpen).toBe(true);
    });

    test('should toggle box from open to closed', async ({ page }) => {
      await page.goto('/#/inventory/box_test_2/edit');

      // Initially open
      await expect(page.locator('.status-badge.open')).toBeVisible();

      // Click toggle
      await page.click('button:has-text("Toggle Closed")');

      // Should now be closed
      await expect(page.locator('.status-badge.closed')).toBeVisible();

      // Verify state persisted
      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes.find((b) => b.id === 'box_test_2')?.isOpen).toBe(false);
    });
  });

  test.describe('Manual Delete', () => {
    test('should show delete confirmation when clicking delete button', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      await page.click('button:has-text("Delete Box")');

      // Confirmation modal should appear
      await expect(page.locator('text=Delete this box of Chocolate?')).toBeVisible();
      await expect(page.locator('text=This action cannot be undone')).toBeVisible();
    });

    test('should cancel delete when clicking cancel', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      await page.click('button:has-text("Delete Box")');
      await page.click('button:has-text("Cancel")');

      // Should still be on edit screen
      await expect(page).toHaveURL('/#/inventory/box_test_1/edit');
      await expect(page.locator('text=Chocolate')).toBeVisible();
    });

    test('should delete box when confirming delete', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      await page.click('button:has-text("Delete Box")');
      await page.locator('button:has-text("Delete Box")').last().click();

      // Should navigate back to inventory
      await expect(page).toHaveURL('/#/inventory');

      // Box should be removed from state
      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes.find((b) => b.id === 'box_test_1')).toBeUndefined();
    });
  });

  test.describe('Set Quantity', () => {
    test('should show Set Quantity button on box edit screen', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');
      await expect(page.getByRole('button', { name: 'Set Quantity' })).toBeVisible();
    });

    test('should open Set Quantity modal when button is clicked', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');
      await page.getByRole('button', { name: 'Set Quantity' }).click();
      await expect(page.locator('h2:has-text("Set Quantity")')).toBeVisible();
    });

    test('should show current quantity in modal label', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');
      await page.getByRole('button', { name: 'Set Quantity' }).click();
      await expect(page.getByText(/current: 5/)).toBeVisible();
    });

    test('confirm button should be disabled until a value is selected', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');
      await page.getByRole('button', { name: 'Set Quantity' }).click();
      await expect(
        page.getByRole('button', { name: 'Set Quantity', exact: true }).last()
      ).toBeDisabled();
    });

    test('should set quantity to selected value', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      // Initial quantity is 5
      await expect(page.locator('.value:has-text("5")')).toBeVisible();

      await page.click('button:has-text("Set Quantity")');
      await page.click('button:has-text("9")');
      await page.click('button:has-text("Set to 9")');

      // Quantity should now be 9 (absolute set, not delta)
      await expect(page.locator('.value:has-text("9")')).toBeVisible();

      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes.find((b) => b.id === 'box_test_1')?.quantity).toBe(9);
    });

    test('cancel should not change the quantity', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      await page.click('button:has-text("Set Quantity")');
      await page.click('button:has-text("3")');
      await page.click('button:has-text("Cancel")');

      // Quantity should remain 5
      await expect(page.locator('.value:has-text("5")')).toBeVisible();

      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes.find((b) => b.id === 'box_test_1')?.quantity).toBe(5);
    });

    test('should not trigger auto-delete prompt (min is 1, not 0)', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      await page.click('button:has-text("Set Quantity")');
      await page.click('button:has-text("1")');
      await page.click('button:has-text("Set to 1")');

      // Should update quantity without showing auto-delete prompt
      // Use detail-item scoping to avoid matching "Stack 1, Height 1" location value
      await expect(
        page.locator('.detail-item:has(.label:has-text("Quantity")) .value:has-text("1")')
      ).toBeVisible();
      await expect(page.locator('h2:has-text("Box Empty")')).not.toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      const h1 = await page.locator('h1');
      await expect(h1).toHaveText('Edit Box');
    });

    test('should have labels for form inputs', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      await page.click('button:has-text("Change Location")');

      const stackLabel = await page.locator('label[for="stack"]');
      const heightLabel = await page.locator('label[for="height"]');

      await expect(stackLabel).toHaveText('Stack (Column):');
      await expect(heightLabel).toHaveText('Height (Row):');
    });

    test('should support keyboard navigation for buttons', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      // Focus the Add button directly and activate it
      const addButton = page.getByRole('button', { name: /add/i }).first();
      await addButton.focus();
      await page.keyboard.press('Enter');

      // Modal should open
      await expect(page.locator('h2:has-text("Add Quantity")')).toBeVisible();
    });
  });

  test.describe('State Persistence', () => {
    test('should persist all changes to localStorage', async ({ page }) => {
      await page.goto('/#/inventory/box_test_1/edit');

      // Make multiple changes
      // 1. Add quantity
      await page.click('button:has-text("Add Quantity")');
      await page.click('button:has-text("2")');
      await page.click('button:has-text("Confirm")');

      // 2. Toggle open/closed
      await page.click('button:has-text("Toggle Open")');

      // 3. Reload page
      await page.reload();

      // All changes should persist
      await expect(page.locator('.value:has-text("7")')).toBeVisible(); // 5 + 2
      await expect(page.locator('.status-badge.open')).toBeVisible();
    });
  });
});
