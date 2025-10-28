/**
 * Unit tests for Svelte stores and state management.
 *
 * Tests cover store initialization, auto-save behavior, action functions,
 * validation, error handling, and integration scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { appState, loadStateFromStorage } from '../../src/lib/stores';
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
});
