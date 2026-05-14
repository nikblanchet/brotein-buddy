/**
 * Unit tests for LocalStorage abstraction layer.
 *
 * Tests cover:
 * - Loading valid and invalid state
 * - Saving state with validation
 * - Error handling (corrupted data, quota exceeded)
 * - Migration framework
 * - Edge cases (missing localStorage, null values)
 *
 * Target: 100% coverage (critical path)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadState, saveState, clearState } from '../../src/lib/storage';
import { type AppState, createDefaultAppState } from '../../src/types/models';

const STORAGE_KEY = 'BROTEINBUDDY_APP_STATE';

describe('storage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('loadState', () => {
    it('should return default state when localStorage is empty', () => {
      const state = loadState();
      const defaultState = createDefaultAppState();

      expect(state).toEqual(defaultState);
      expect(state.version).toBe(3);
      expect(state.boxes).toEqual([]);
      expect(state.flavors).toEqual([]);
      expect(state.favoriteFlavorId).toBeNull();
      expect(state.settings).toEqual({});
      expect(state.events).toEqual([]);
    });

    it('should load valid state from localStorage', () => {
      const validState: AppState = {
        version: 3,
        boxes: [
          {
            id: 'box1',
            flavorId: 'flavor1',
            quantity: 12,
            location: { stack: 0, height: 0 },
            isOpen: false,
          },
        ],
        flavors: [
          {
            id: 'flavor1',
            name: 'Chocolate',
            randomPool: 'caffeinated',
          },
        ],
        favoriteFlavorId: 'flavor1',
        settings: {},
        events: [],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(validState));

      const loaded = loadState();
      expect(loaded).toEqual(validState);
    });

    it('should return default state when JSON is corrupted', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      localStorage.setItem(STORAGE_KEY, 'invalid json {{{');

      const state = loadState();
      expect(state).toEqual(createDefaultAppState());
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load state from localStorage:',
        expect.any(SyntaxError)
      );

      consoleSpy.mockRestore();
    });

    it('should return default state when schema is invalid (missing version)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const invalidState = {
        // Missing version field
        boxes: [],
        flavors: [],
        favoriteFlavorId: null,
        settings: {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidState));

      const state = loadState();
      expect(state).toEqual(createDefaultAppState());
      expect(consoleSpy).toHaveBeenCalledWith('Stored data failed validation, using default state');

      consoleSpy.mockRestore();
    });

    it('should return default state when schema is invalid (missing boxes)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const invalidState = {
        version: 1,
        // Missing boxes field
        flavors: [],
        favoriteFlavorId: null,
        settings: {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidState));

      const state = loadState();
      expect(state).toEqual(createDefaultAppState());
      expect(consoleSpy).toHaveBeenCalledWith('Stored data failed validation, using default state');

      consoleSpy.mockRestore();
    });

    it('should return default state when boxes array contains invalid box', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const invalidState = {
        version: 1,
        boxes: [
          {
            id: 'box1',
            flavorId: 'flavor1',
            quantity: -5, // Invalid: negative quantity
            location: { stack: 0, height: 0 },
            isOpen: false,
          },
        ],
        flavors: [],
        favoriteFlavorId: null,
        settings: {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidState));

      const state = loadState();
      expect(state).toEqual(createDefaultAppState());
      expect(consoleSpy).toHaveBeenCalledWith('Stored data failed validation, using default state');

      consoleSpy.mockRestore();
    });

    it('should return default state when flavors array contains invalid flavor', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const invalidState = {
        version: 2,
        boxes: [],
        flavors: [
          {
            id: '', // Invalid: empty ID
            name: 'Chocolate',
            randomPool: 'caffeinated',
          },
        ],
        favoriteFlavorId: null,
        settings: {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidState));

      const state = loadState();
      expect(state).toEqual(createDefaultAppState());
      expect(consoleSpy).toHaveBeenCalledWith('Stored data failed validation, using default state');

      consoleSpy.mockRestore();
    });

    it('should return default state when favoriteFlavorId is invalid type', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const invalidState = {
        version: 1,
        boxes: [],
        flavors: [],
        favoriteFlavorId: 123, // Invalid: should be string or null
        settings: {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidState));

      const state = loadState();
      expect(state).toEqual(createDefaultAppState());
      expect(consoleSpy).toHaveBeenCalledWith('Stored data failed validation, using default state');

      consoleSpy.mockRestore();
    });

    it('should handle localStorage being unavailable', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock localStorage as undefined
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const state = loadState();
      expect(state).toEqual(createDefaultAppState());
      expect(consoleSpy).toHaveBeenCalledWith('localStorage not available, using default state');

      // Restore localStorage
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('saveState', () => {
    it('should save valid state to localStorage', () => {
      const validState: AppState = {
        version: 3,
        boxes: [
          {
            id: 'box1',
            flavorId: 'flavor1',
            quantity: 12,
            location: { stack: 0, height: 0 },
            isOpen: false,
          },
        ],
        flavors: [
          {
            id: 'flavor1',
            name: 'Chocolate',
            randomPool: 'caffeinated',
          },
        ],
        favoriteFlavorId: 'flavor1',
        settings: {},
        events: [],
      };

      saveState(validState);

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(validState);
    });

    it('should throw error when state is invalid (missing version)', () => {
      const invalidState = {
        // Missing version field
        boxes: [],
        flavors: [],
        favoriteFlavorId: null,
        settings: {},
      } as unknown as AppState;

      expect(() => saveState(invalidState)).toThrow(
        'Cannot save invalid state: schema validation failed'
      );
    });

    it('should throw error when state is invalid (bad box)', () => {
      const invalidState = {
        version: 1,
        boxes: [
          {
            id: 'box1',
            flavorId: 'flavor1',
            quantity: -5, // Invalid
            location: { stack: 0, height: 0 },
            isOpen: false,
          },
        ],
        flavors: [],
        favoriteFlavorId: null,
        settings: {},
      } as unknown as AppState;

      expect(() => saveState(invalidState)).toThrow(
        'Cannot save invalid state: schema validation failed'
      );
    });

    it('should handle quota exceeded error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage.setItem to throw QuotaExceededError
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError;
      });

      const validState = createDefaultAppState();

      expect(() => saveState(validState)).toThrow(DOMException);
      expect(consoleErrorSpy).toHaveBeenCalledWith('LocalStorage quota exceeded');

      consoleErrorSpy.mockRestore();
    });

    it('should handle other storage errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage.setItem to throw generic error
      const genericError = new Error('Storage error');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw genericError;
      });

      const validState = createDefaultAppState();

      expect(() => saveState(validState)).toThrow(Error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save state to localStorage:',
        genericError
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearState', () => {
    it('should remove state from localStorage', () => {
      const state = createDefaultAppState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

      clearState();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should handle errors when clearing state', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock localStorage.removeItem to throw error
      const error = new Error('Remove error');
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw error;
      });

      clearState();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to clear state from localStorage:',
        error
      );

      consoleWarnSpy.mockRestore();
    });

    it('should work even when no state was stored', () => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

      clearState();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('schema migration', () => {
    it('should migrate v1 state with excludeFromRandom: false to randomPool caffeine-free', () => {
      const v1State = {
        version: 1,
        boxes: [],
        flavors: [
          {
            id: 'flavor1',
            name: 'Chocolate',
            excludeFromRandom: false,
          },
        ],
        favoriteFlavorId: null,
        settings: {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(v1State));

      const loaded = loadState();
      expect(loaded.version).toBe(3);
      expect(loaded.flavors[0].randomPool).toBe('caffeine-free');
      expect((loaded.flavors[0] as Record<string, unknown>).excludeFromRandom).toBeUndefined();
    });

    it('should migrate v1 state with excludeFromRandom: true to randomPool null', () => {
      const v1State = {
        version: 1,
        boxes: [],
        flavors: [
          {
            id: 'flavor1',
            name: 'Peanut Butter',
            excludeFromRandom: true,
          },
        ],
        favoriteFlavorId: null,
        settings: {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(v1State));

      const loaded = loadState();
      expect(loaded.version).toBe(3);
      expect(loaded.flavors[0].randomPool).toBeNull();
    });

    it('should migrate multiple flavors correctly', () => {
      const v1State = {
        version: 1,
        boxes: [],
        flavors: [
          { id: 'f1', name: 'Chocolate', excludeFromRandom: false },
          { id: 'f2', name: 'Vanilla', excludeFromRandom: false },
          { id: 'f3', name: 'Peanut Butter', excludeFromRandom: true },
        ],
        favoriteFlavorId: 'f1',
        settings: {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(v1State));

      const loaded = loadState();
      expect(loaded.version).toBe(3);
      expect(loaded.flavors[0].randomPool).toBe('caffeine-free');
      expect(loaded.flavors[1].randomPool).toBe('caffeine-free');
      expect(loaded.flavors[2].randomPool).toBeNull();
    });

    it('should chain v1 through to v3, adding an empty events array', () => {
      const v1State = {
        version: 1,
        boxes: [],
        flavors: [{ id: 'f1', name: 'Chocolate', excludeFromRandom: false }],
        favoriteFlavorId: null,
        settings: {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(v1State));

      const loaded = loadState();
      expect(loaded.version).toBe(3);
      expect(loaded.events).toEqual([]);
    });

    it('should migrate v2 state to v3 with an empty events array', () => {
      const v2State = {
        version: 2,
        boxes: [
          {
            id: 'box1',
            flavorId: 'f1',
            quantity: 12,
            location: { stack: 0, height: 0 },
            isOpen: false,
          },
        ],
        flavors: [{ id: 'f1', name: 'Chocolate', randomPool: 'caffeinated' }],
        favoriteFlavorId: 'f1',
        settings: {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(v2State));

      const loaded = loadState();
      expect(loaded.version).toBe(3);
      expect(loaded.events).toEqual([]);
      expect(loaded.flavors[0].randomPool).toBe('caffeinated');
      expect(loaded.boxes).toHaveLength(1);
    });

    it('should not modify v3 state during migration', () => {
      const v3State: AppState = {
        version: 3,
        boxes: [],
        flavors: [{ id: 'f1', name: 'Chocolate', randomPool: 'caffeinated' }],
        favoriteFlavorId: null,
        settings: {},
        events: [
          {
            id: 'ev_existing',
            timestamp: '2026-05-01T12:00:00.000Z',
            type: 'box_opened',
            boxId: 'box1',
            flavorId: 'f1',
          },
        ],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(v3State));

      const loaded = loadState();
      expect(loaded).toEqual(v3State);
    });

    it('should preserve boxes and other state during migration', () => {
      const v1State = {
        version: 1,
        boxes: [
          {
            id: 'box1',
            flavorId: 'f1',
            quantity: 12,
            location: { stack: 0, height: 0 },
            isOpen: false,
          },
        ],
        flavors: [{ id: 'f1', name: 'Chocolate', excludeFromRandom: false }],
        favoriteFlavorId: 'f1',
        settings: {},
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(v1State));

      const loaded = loadState();
      expect(loaded.boxes).toHaveLength(1);
      expect(loaded.boxes[0].id).toBe('box1');
      expect(loaded.favoriteFlavorId).toBe('f1');
    });
  });

  describe('integration scenarios', () => {
    it('should persist state across save and load', () => {
      const originalState: AppState = {
        version: 3,
        boxes: [
          {
            id: 'box1',
            flavorId: 'flavor1',
            quantity: 10,
            location: { stack: 1, height: 2 },
            isOpen: true,
          },
          {
            id: 'box2',
            flavorId: 'flavor2',
            quantity: 12,
            location: { stack: 0, height: 0 },
            isOpen: false,
          },
        ],
        flavors: [
          {
            id: 'flavor1',
            name: 'Chocolate',
            randomPool: 'caffeinated',
          },
          {
            id: 'flavor2',
            name: 'Vanilla',
            randomPool: null,
          },
        ],
        favoriteFlavorId: 'flavor1',
        settings: {},
        events: [],
      };

      saveState(originalState);
      const loaded = loadState();

      expect(loaded).toEqual(originalState);
    });

    it('should return default state after clearing', () => {
      const state = createDefaultAppState();
      state.boxes.push({
        id: 'box1',
        flavorId: 'flavor1',
        quantity: 12,
        location: { stack: 0, height: 0 },
        isOpen: false,
      });

      saveState(state);
      expect(loadState().boxes).toHaveLength(1);

      clearState();

      const loaded = loadState();
      expect(loaded).toEqual(createDefaultAppState());
      expect(loaded.boxes).toHaveLength(0);
    });
  });
});
