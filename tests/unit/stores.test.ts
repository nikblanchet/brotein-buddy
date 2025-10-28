/**
 * Unit tests for Svelte stores and state management.
 *
 * Tests cover store initialization, auto-save behavior, action functions,
 * validation, error handling, and integration scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  appState,
  loadStateFromStorage,
  addBox,
  removeBox,
  updateBoxQuantity,
  updateBoxLocation,
  addFlavor,
  updateFlavor,
  setFavoriteFlavor,
} from '../../src/lib/stores';
import type { Box, Flavor, Location } from '../../src/types/models';

/**
 * Test helper: Gets current store value synchronously.
 */
function getCurrentState() {
  return get(appState);
}

/**
 * Test helper: Creates a valid test box with optional overrides.
 */
function createTestBox(overrides?: Partial<Box>): Box {
  return {
    id: `box_${Date.now()}_${Math.random()}`,
    flavorId: 'flavor_test',
    quantity: 12,
    location: { stack: 0, height: 0 },
    isOpen: false,
    ...overrides,
  };
}

/**
 * Test helper: Creates a valid test flavor with optional overrides.
 */
function createTestFlavor(overrides?: Partial<Flavor>): Flavor {
  return {
    id: `flavor_${Date.now()}_${Math.random()}`,
    name: 'Test Flavor',
    excludeFromRandom: false,
    ...overrides,
  };
}

describe('stores', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset store to clean state
    loadStateFromStorage();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Initialization and Loading', () => {
    it('should initialize with default state when localStorage is empty', () => {
      const state = getCurrentState();
      expect(state.boxes).toEqual([]);
      expect(state.flavors).toEqual([]);
      expect(state.favoriteFlavorId).toBeNull();
      expect(state.settings).toEqual({});
      expect(state.version).toBe(1);
    });

    it('should initialize with data from localStorage if available', () => {
      // Set up localStorage with test data
      const testState = {
        boxes: [createTestBox()],
        flavors: [createTestFlavor()],
        favoriteFlavorId: 'flavor_test',
        settings: {},
        version: 1,
      };
      localStorage.setItem('BROTEINBUDDY_APP_STATE', JSON.stringify(testState));

      // Reload state
      loadStateFromStorage();

      const state = getCurrentState();
      expect(state.boxes).toHaveLength(1);
      expect(state.flavors).toHaveLength(1);
      expect(state.favoriteFlavorId).toBe('flavor_test');
    });

    it('should reload state from localStorage when loadStateFromStorage is called', () => {
      // Start with empty state
      let state = getCurrentState();
      expect(state.boxes).toHaveLength(0);

      // Manually add data to localStorage
      const testState = {
        boxes: [createTestBox(), createTestBox()],
        flavors: [createTestFlavor()],
        favoriteFlavorId: null,
        settings: {},
        version: 1,
      };
      localStorage.setItem('BROTEINBUDDY_APP_STATE', JSON.stringify(testState));

      // Reload
      loadStateFromStorage();

      state = getCurrentState();
      expect(state.boxes).toHaveLength(2);
      expect(state.flavors).toHaveLength(1);
    });
  });

  describe('Auto-Save Behavior', () => {
    it('should automatically save state changes to localStorage', () => {
      // Get initial state
      const state = getCurrentState();

      // Modify state directly (will trigger subscription)
      appState.set({
        ...state,
        favoriteFlavorId: 'flavor_123',
      });

      // Verify localStorage was updated
      const stored = localStorage.getItem('BROTEINBUDDY_APP_STATE');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.favoriteFlavorId).toBe('flavor_123');
    });

    it('should persist multiple rapid changes', () => {
      const state = getCurrentState();

      // Make several rapid changes
      appState.set({ ...state, favoriteFlavorId: 'flavor_1' });
      appState.set({ ...getCurrentState(), favoriteFlavorId: 'flavor_2' });
      appState.set({ ...getCurrentState(), favoriteFlavorId: 'flavor_3' });

      // Verify final state is persisted
      const stored = localStorage.getItem('BROTEINBUDDY_APP_STATE');
      const parsed = JSON.parse(stored!);
      expect(parsed.favoriteFlavorId).toBe('flavor_3');
    });

    it('should allow subscribing to state changes', () => {
      const updates: string[] = [];

      // Subscribe to changes
      const unsubscribe = appState.subscribe((state) => {
        updates.push(state.favoriteFlavorId ?? 'null');
      });

      // Make changes
      appState.set({ ...getCurrentState(), favoriteFlavorId: 'flavor_1' });
      appState.set({ ...getCurrentState(), favoriteFlavorId: 'flavor_2' });

      // Should have received updates (including initial subscription)
      expect(updates.length).toBeGreaterThanOrEqual(3);
      expect(updates).toContain('flavor_1');
      expect(updates).toContain('flavor_2');

      unsubscribe();
    });

    it('should log errors but not crash when save fails', () => {
      // Mock saveState to throw an error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Mock save failure');
      });

      // This should not throw even though save fails
      expect(() => {
        appState.set({ ...getCurrentState(), favoriteFlavorId: 'test' });
      }).not.toThrow();

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith('Failed to auto-save state:', expect.any(Error));

      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should handle quota exceeded gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw error;
      });

      // State update should succeed even if save fails
      appState.set({ ...getCurrentState(), favoriteFlavorId: 'test' });

      const state = getCurrentState();
      expect(state.favoriteFlavorId).toBe('test');

      // Error should be logged
      expect(consoleSpy).toHaveBeenCalled();

      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Box Operations', () => {
    describe('addBox', () => {
      it('should add a new box to the state', () => {
        const box = createTestBox();
        addBox(box);

        const state = getCurrentState();
        expect(state.boxes).toHaveLength(1);
        expect(state.boxes[0]).toEqual(box);
      });

      it('should persist added box to localStorage', () => {
        const box = createTestBox({ id: 'box_persist_test' });
        addBox(box);

        // Verify localStorage was updated
        const stored = localStorage.getItem('BROTEINBUDDY_APP_STATE');
        const parsed = JSON.parse(stored!);
        expect(parsed.boxes).toHaveLength(1);
        expect(parsed.boxes[0].id).toBe('box_persist_test');
      });

      it('should throw error when adding box with duplicate ID', () => {
        const box1 = createTestBox({ id: 'box_duplicate' });
        const box2 = createTestBox({ id: 'box_duplicate' });

        addBox(box1);

        expect(() => addBox(box2)).toThrow('Box with ID "box_duplicate" already exists');

        // Verify only one box exists
        const state = getCurrentState();
        expect(state.boxes).toHaveLength(1);
      });

      it('should allow adding multiple boxes with different IDs', () => {
        const box1 = createTestBox({ id: 'box_1' });
        const box2 = createTestBox({ id: 'box_2' });
        const box3 = createTestBox({ id: 'box_3' });

        addBox(box1);
        addBox(box2);
        addBox(box3);

        const state = getCurrentState();
        expect(state.boxes).toHaveLength(3);
        expect(state.boxes.map((b) => b.id)).toEqual(['box_1', 'box_2', 'box_3']);
      });

      it('should not validate flavorId (allows adding boxes before flavors)', () => {
        const box = createTestBox({ flavorId: 'nonexistent_flavor' });

        // Should not throw even though flavor doesn't exist
        expect(() => addBox(box)).not.toThrow();

        const state = getCurrentState();
        expect(state.boxes).toHaveLength(1);
        expect(state.boxes[0].flavorId).toBe('nonexistent_flavor');
      });
    });

    describe('removeBox', () => {
      it('should remove a box from the state', () => {
        const box = createTestBox({ id: 'box_to_remove' });
        addBox(box);

        let state = getCurrentState();
        expect(state.boxes).toHaveLength(1);

        removeBox('box_to_remove');

        state = getCurrentState();
        expect(state.boxes).toHaveLength(0);
      });

      it('should persist removal to localStorage', () => {
        const box1 = createTestBox({ id: 'box_1' });
        const box2 = createTestBox({ id: 'box_2' });
        addBox(box1);
        addBox(box2);

        removeBox('box_1');

        const stored = localStorage.getItem('BROTEINBUDDY_APP_STATE');
        const parsed = JSON.parse(stored!);
        expect(parsed.boxes).toHaveLength(1);
        expect(parsed.boxes[0].id).toBe('box_2');
      });

      it('should throw error when removing non-existent box', () => {
        expect(() => removeBox('nonexistent')).toThrow('Box with ID "nonexistent" not found');

        const state = getCurrentState();
        expect(state.boxes).toHaveLength(0);
      });

      it('should remove correct box when multiple exist', () => {
        const box1 = createTestBox({ id: 'box_1' });
        const box2 = createTestBox({ id: 'box_2' });
        const box3 = createTestBox({ id: 'box_3' });

        addBox(box1);
        addBox(box2);
        addBox(box3);

        removeBox('box_2');

        const state = getCurrentState();
        expect(state.boxes).toHaveLength(2);
        expect(state.boxes.map((b) => b.id)).toEqual(['box_1', 'box_3']);
      });
    });

    describe('updateBoxQuantity', () => {
      it('should update box quantity', () => {
        const box = createTestBox({ id: 'box_qty', quantity: 12 });
        addBox(box);

        updateBoxQuantity('box_qty', 5);

        const state = getCurrentState();
        expect(state.boxes[0].quantity).toBe(5);
      });

      it('should persist quantity update to localStorage', () => {
        const box = createTestBox({ id: 'box_qty' });
        addBox(box);

        updateBoxQuantity('box_qty', 8);

        const stored = localStorage.getItem('BROTEINBUDDY_APP_STATE');
        const parsed = JSON.parse(stored!);
        expect(parsed.boxes[0].quantity).toBe(8);
      });

      it('should allow updating quantity to zero', () => {
        const box = createTestBox({ id: 'box_zero', quantity: 5 });
        addBox(box);

        expect(() => updateBoxQuantity('box_zero', 0)).not.toThrow();

        const state = getCurrentState();
        expect(state.boxes[0].quantity).toBe(0);
      });

      it('should throw error on negative quantity', () => {
        const box = createTestBox({ id: 'box_neg' });
        addBox(box);

        expect(() => updateBoxQuantity('box_neg', -1)).toThrow(
          'Quantity must be non-negative, got -1'
        );
      });

      it('should throw error on non-integer quantity', () => {
        const box = createTestBox({ id: 'box_float' });
        addBox(box);

        expect(() => updateBoxQuantity('box_float', 3.5)).toThrow(
          'Quantity must be an integer, got 3.5'
        );
      });

      it('should throw error when box not found', () => {
        expect(() => updateBoxQuantity('nonexistent', 5)).toThrow(
          'Box with ID "nonexistent" not found'
        );
      });

      it('should not modify other box properties', () => {
        const box = createTestBox({
          id: 'box_props',
          quantity: 12,
          flavorId: 'flavor_test',
          isOpen: true,
        });
        addBox(box);

        updateBoxQuantity('box_props', 6);

        const state = getCurrentState();
        const updated = state.boxes[0];
        expect(updated.quantity).toBe(6);
        expect(updated.flavorId).toBe('flavor_test');
        expect(updated.isOpen).toBe(true);
        expect(updated.location).toEqual(box.location);
      });
    });

    describe('updateBoxLocation', () => {
      it('should update box location', () => {
        const box = createTestBox({ id: 'box_loc', location: { stack: 0, height: 0 } });
        addBox(box);

        updateBoxLocation('box_loc', { stack: 2, height: 3 });

        const state = getCurrentState();
        expect(state.boxes[0].location).toEqual({ stack: 2, height: 3 });
      });

      it('should persist location update to localStorage', () => {
        const box = createTestBox({ id: 'box_loc' });
        addBox(box);

        updateBoxLocation('box_loc', { stack: 5, height: 1 });

        const stored = localStorage.getItem('BROTEINBUDDY_APP_STATE');
        const parsed = JSON.parse(stored!);
        expect(parsed.boxes[0].location).toEqual({ stack: 5, height: 1 });
      });

      it('should throw error when box not found', () => {
        expect(() => updateBoxLocation('nonexistent', { stack: 1, height: 1 })).toThrow(
          'Box with ID "nonexistent" not found'
        );
      });

      it('should not modify other box properties', () => {
        const box = createTestBox({
          id: 'box_loc_props',
          quantity: 12,
          flavorId: 'flavor_test',
          isOpen: true,
        });
        addBox(box);

        updateBoxLocation('box_loc_props', { stack: 3, height: 2 });

        const state = getCurrentState();
        const updated = state.boxes[0];
        expect(updated.location).toEqual({ stack: 3, height: 2 });
        expect(updated.quantity).toBe(12);
        expect(updated.flavorId).toBe('flavor_test');
        expect(updated.isOpen).toBe(true);
      });

      it('should not validate location conflicts', () => {
        const box1 = createTestBox({ id: 'box_1', location: { stack: 1, height: 0 } });
        const box2 = createTestBox({ id: 'box_2', location: { stack: 2, height: 0 } });

        addBox(box1);
        addBox(box2);

        // Should not throw even though boxes will be at same location
        expect(() => updateBoxLocation('box_2', { stack: 1, height: 0 })).not.toThrow();

        const state = getCurrentState();
        expect(state.boxes[0].location).toEqual({ stack: 1, height: 0 });
        expect(state.boxes[1].location).toEqual({ stack: 1, height: 0 });
      });
    });
  });

  describe('Flavor Operations', () => {
    describe('addFlavor', () => {
      it('should add a new flavor to the state', () => {
        const flavor = createTestFlavor();
        addFlavor(flavor);

        const state = getCurrentState();
        expect(state.flavors).toHaveLength(1);
        expect(state.flavors[0]).toEqual(flavor);
      });

      it('should persist added flavor to localStorage', () => {
        const flavor = createTestFlavor({ id: 'flavor_persist_test' });
        addFlavor(flavor);

        const stored = localStorage.getItem('BROTEINBUDDY_APP_STATE');
        const parsed = JSON.parse(stored!);
        expect(parsed.flavors).toHaveLength(1);
        expect(parsed.flavors[0].id).toBe('flavor_persist_test');
      });

      it('should throw error when adding flavor with duplicate ID', () => {
        const flavor1 = createTestFlavor({ id: 'flavor_duplicate' });
        const flavor2 = createTestFlavor({ id: 'flavor_duplicate' });

        addFlavor(flavor1);

        expect(() => addFlavor(flavor2)).toThrow(
          'Flavor with ID "flavor_duplicate" already exists'
        );

        const state = getCurrentState();
        expect(state.flavors).toHaveLength(1);
      });

      it('should allow adding multiple flavors with different IDs', () => {
        const flavor1 = createTestFlavor({ id: 'flavor_1' });
        const flavor2 = createTestFlavor({ id: 'flavor_2' });
        const flavor3 = createTestFlavor({ id: 'flavor_3' });

        addFlavor(flavor1);
        addFlavor(flavor2);
        addFlavor(flavor3);

        const state = getCurrentState();
        expect(state.flavors).toHaveLength(3);
        expect(state.flavors.map((f) => f.id)).toEqual(['flavor_1', 'flavor_2', 'flavor_3']);
      });
    });

    describe('updateFlavor', () => {
      it('should update flavor name', () => {
        const flavor = createTestFlavor({ id: 'flavor_update', name: 'Original' });
        addFlavor(flavor);

        updateFlavor('flavor_update', { name: 'Updated' });

        const state = getCurrentState();
        expect(state.flavors[0].name).toBe('Updated');
      });

      it('should update excludeFromRandom flag', () => {
        const flavor = createTestFlavor({ id: 'flavor_exclude', excludeFromRandom: false });
        addFlavor(flavor);

        updateFlavor('flavor_exclude', { excludeFromRandom: true });

        const state = getCurrentState();
        expect(state.flavors[0].excludeFromRandom).toBe(true);
      });

      it('should update multiple fields at once', () => {
        const flavor = createTestFlavor({
          id: 'flavor_multi',
          name: 'Original',
          excludeFromRandom: false,
        });
        addFlavor(flavor);

        updateFlavor('flavor_multi', { name: 'New Name', excludeFromRandom: true });

        const state = getCurrentState();
        expect(state.flavors[0].name).toBe('New Name');
        expect(state.flavors[0].excludeFromRandom).toBe(true);
      });

      it('should persist flavor updates to localStorage', () => {
        const flavor = createTestFlavor({ id: 'flavor_persist' });
        addFlavor(flavor);

        updateFlavor('flavor_persist', { name: 'Persisted Name' });

        const stored = localStorage.getItem('BROTEINBUDDY_APP_STATE');
        const parsed = JSON.parse(stored!);
        expect(parsed.flavors[0].name).toBe('Persisted Name');
      });

      it('should throw error when flavor not found', () => {
        expect(() => updateFlavor('nonexistent', { name: 'Test' })).toThrow(
          'Flavor with ID "nonexistent" not found'
        );
      });

      it('should not allow changing flavor ID via updates', () => {
        const flavor = createTestFlavor({ id: 'flavor_id_test' });
        addFlavor(flavor);

        // Try to change ID (should be ignored)
        updateFlavor('flavor_id_test', { id: 'new_id', name: 'Updated' } as Partial<Flavor>);

        const state = getCurrentState();
        expect(state.flavors[0].id).toBe('flavor_id_test');
        expect(state.flavors[0].name).toBe('Updated');
      });

      it('should handle partial updates correctly', () => {
        const flavor = createTestFlavor({
          id: 'flavor_partial',
          name: 'Original',
          excludeFromRandom: false,
        });
        addFlavor(flavor);

        // Update only name
        updateFlavor('flavor_partial', { name: 'Only Name Changed' });

        const state = getCurrentState();
        expect(state.flavors[0].name).toBe('Only Name Changed');
        expect(state.flavors[0].excludeFromRandom).toBe(false); // Should not change
      });
    });

    describe('setFavoriteFlavor', () => {
      it('should set favorite flavor', () => {
        setFavoriteFlavor('flavor_favorite');

        const state = getCurrentState();
        expect(state.favoriteFlavorId).toBe('flavor_favorite');
      });

      it('should clear favorite flavor with null', () => {
        setFavoriteFlavor('flavor_favorite');
        setFavoriteFlavor(null);

        const state = getCurrentState();
        expect(state.favoriteFlavorId).toBeNull();
      });

      it('should persist favorite flavor to localStorage', () => {
        setFavoriteFlavor('flavor_persist');

        const stored = localStorage.getItem('BROTEINBUDDY_APP_STATE');
        const parsed = JSON.parse(stored!);
        expect(parsed.favoriteFlavorId).toBe('flavor_persist');
      });

      it('should allow changing favorite flavor', () => {
        setFavoriteFlavor('flavor_1');
        setFavoriteFlavor('flavor_2');
        setFavoriteFlavor('flavor_3');

        const state = getCurrentState();
        expect(state.favoriteFlavorId).toBe('flavor_3');
      });

      it('should not validate that flavor exists', () => {
        // Should not throw even though flavor doesn't exist
        expect(() => setFavoriteFlavor('nonexistent_flavor')).not.toThrow();

        const state = getCurrentState();
        expect(state.favoriteFlavorId).toBe('nonexistent_flavor');
      });
    });
  });
});
