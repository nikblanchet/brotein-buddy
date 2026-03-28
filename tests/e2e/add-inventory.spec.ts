/**
 * End-to-end tests for the Add Inventory feature
 *
 * Tests the Add Inventory modal flow including closed box adds,
 * open box adds, mode selection, validation, and cancel behavior.
 *
 * @group e2e
 * @module tests/e2e/add-inventory
 */

import { test, expect } from '@playwright/test';
import type { AppState } from '../../src/types/models';
import { STORAGE_KEY } from '../../src/lib/storage';

const BASE_STATE = {
  version: 2,
  boxes: [
    {
      id: 'box_1',
      flavorId: 'flavor_chocolate',
      quantity: 12,
      location: { stack: 1, height: 1 },
      isOpen: false,
    },
  ],
  flavors: [
    { id: 'flavor_chocolate', name: 'Chocolate', randomPool: 'caffeine-free' },
    { id: 'flavor_vanilla', name: 'Vanilla', randomPool: 'caffeine-free' },
  ],
  favoriteFlavorId: null,
  settings: {},
};

const EMPTY_STATE = {
  version: 2,
  boxes: [],
  flavors: [{ id: 'flavor_chocolate', name: 'Chocolate', randomPool: 'caffeine-free' }],
  favoriteFlavorId: null,
  settings: {},
};

test.describe('Add Inventory', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      ({ key, state }) => {
        localStorage.setItem(key, JSON.stringify(state));
      },
      { key: STORAGE_KEY, state: BASE_STATE }
    );
  });

  test.describe('Button and Modal Access', () => {
    test('should show Add Inventory button on inventory screen', async ({ page }) => {
      await page.goto('/#/inventory');
      await expect(page.getByRole('button', { name: 'Add Inventory' })).toBeVisible();
    });

    test('should open Add Inventory modal when button is clicked', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await expect(page.getByRole('heading', { name: 'Add Inventory' })).toBeVisible();
    });

    test('should close modal when Cancel is clicked (from mode select)', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await expect(page.getByRole('heading', { name: 'Add Inventory' })).toBeVisible();

      // Click somewhere to close (backdrop or Escape)
      await page.keyboard.press('Escape');
      await expect(page.getByRole('heading', { name: 'Add Inventory' })).not.toBeVisible();
    });
  });

  test.describe('Mode Selection', () => {
    test('should show two mode options: Closed Boxes and Open Box', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();

      await expect(page.getByText('Closed Boxes')).toBeVisible();
      await expect(page.getByText('Open Box')).toBeVisible();
    });

    test('should navigate to closed detail step when Closed Boxes is selected', async ({
      page,
    }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Closed Boxes').click();

      await expect(page.getByText('Number of boxes to add')).toBeVisible();
    });

    test('should navigate to open detail step when Open Box is selected', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Open Box').click();

      await expect(page.getByText('Number of bottles in the open box')).toBeVisible();
    });

    test('should return to mode selection when Back is clicked', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Closed Boxes').click();

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(page.getByText('Closed Boxes')).toBeVisible();
      await expect(page.getByText('Open Box')).toBeVisible();
    });
  });

  test.describe('Closed Boxes Flow', () => {
    test('Add Boxes button should be disabled until a count is selected', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Closed Boxes').click();

      await expect(page.getByRole('button', { name: 'Add Boxes' })).toBeDisabled();
    });

    test('should add one closed box and show it in inventory', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Closed Boxes').click();

      // Select count of 1 on the NumberPad
      await page.click('button:has-text("1")');

      // Confirm
      await page.getByRole('button', { name: /Add 1 Box/i }).click();

      // Modal should close
      await expect(page.getByRole('heading', { name: 'Add Inventory' })).not.toBeVisible();

      // New box should appear in inventory (was 1 box, now 2)
      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes).toHaveLength(2);
      const newBox = state.boxes.find((b) => b.id !== 'box_1');
      expect(newBox).toBeDefined();
      expect(newBox?.quantity).toBe(12);
      expect(newBox?.isOpen).toBe(false);
      expect(newBox?.flavorId).toBe('flavor_chocolate'); // first flavor pre-selected
    });

    test('should add three closed boxes with sequential locations', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Closed Boxes').click();

      // Select count of 3 on the NumberPad
      await page.click('button:has-text("3")');
      await page.getByRole('button', { name: /Add 3 Boxes/i }).click();

      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      const newBoxes = state.boxes.filter((b) => b.id !== 'box_1');
      expect(newBoxes).toHaveLength(3);
      newBoxes.forEach((b) => expect(b.quantity).toBe(12));
      newBoxes.forEach((b) => expect(b.isOpen).toBe(false));

      // All locations should be unique
      const locs = newBoxes.map((b) => `${b.location.stack},${b.location.height}`);
      expect(new Set(locs).size).toBe(3);
    });

    test('should pre-select the first flavor', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Closed Boxes').click();

      const selectedValue = await page.locator('#flavor-select').inputValue();
      expect(selectedValue).toBe('flavor_chocolate');
    });

    test('should allow selecting a different flavor', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Closed Boxes').click();

      // Change flavor to Vanilla
      await page.locator('#flavor-select').selectOption('flavor_vanilla');
      await page.click('button:has-text("2")');
      await page.getByRole('button', { name: /Add 2 Boxes/i }).click();

      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      const newBoxes = state.boxes.filter((b) => b.id !== 'box_1');
      expect(newBoxes).toHaveLength(2);
      newBoxes.forEach((b) => expect(b.flavorId).toBe('flavor_vanilla'));
    });

    test('should reset modal state after closing and reopening', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Closed Boxes').click();

      // Navigate to close
      await page.getByRole('button', { name: 'Back' }).click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('heading', { name: 'Add Inventory' })).not.toBeVisible();

      // Reopen — should be back at mode select
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await expect(page.getByText('Closed Boxes')).toBeVisible();
      await expect(page.getByText('Open Box')).toBeVisible();
    });
  });

  test.describe('Open Box Flow', () => {
    test('Add Open Box button should be disabled until a quantity is selected', async ({
      page,
    }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Open Box').click();

      await expect(page.getByRole('button', { name: 'Add Open Box' })).toBeDisabled();
    });

    test('should add one open box with correct quantity', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Open Box').click();

      // Select quantity 7
      await page.click('button:has-text("7")');
      await page.getByRole('button', { name: /Add Open Box/i }).click();

      // Modal should close
      await expect(page.getByRole('heading', { name: 'Add Inventory' })).not.toBeVisible();

      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      const newBox = state.boxes.find((b) => b.id !== 'box_1');
      expect(newBox).toBeDefined();
      expect(newBox?.quantity).toBe(7);
      expect(newBox?.isOpen).toBe(true);
    });

    test('cancel in open box detail should not add any boxes', async ({ page }) => {
      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Open Box').click();

      await page.click('button:has-text("5")');
      await page.getByRole('button', { name: 'Cancel' }).click();

      await expect(page.getByRole('heading', { name: 'Add Inventory' })).not.toBeVisible();

      const state = await page.evaluate<AppState>(() =>
        JSON.parse(localStorage.getItem('BROTEINBUDDY_APP_STATE') || '{}')
      );
      expect(state.boxes).toHaveLength(1); // unchanged
    });
  });

  test.describe('Empty inventory state', () => {
    test('should work with empty boxes and suggest stack 1, height 1', async ({
      page,
      context,
    }) => {
      await context.addInitScript(
        ({ key, state }) => {
          localStorage.setItem(key, JSON.stringify(state));
        },
        { key: STORAGE_KEY, state: EMPTY_STATE }
      );

      await page.goto('/#/inventory');
      await page.getByRole('button', { name: 'Add Inventory' }).click();
      await page.getByText('Closed Boxes').click();

      await expect(page.getByText('Stack 1, Height 1')).toBeVisible();
    });
  });
});
