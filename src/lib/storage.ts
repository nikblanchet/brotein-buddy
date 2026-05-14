/**
 * LocalStorage abstraction layer for BroteinBuddy application state.
 *
 * Provides functions to persist and retrieve application state from browser localStorage
 * with validation, error handling, and migration support.
 *
 * Note: {@link migrateState} is exported (in addition to the higher-level
 * {@link loadState} / {@link saveState} entry points) so that the backup/
 * restore flow in `lib/backup.ts` can apply the same schema migrations to
 * a JSON payload coming from a file as we apply to data already sitting
 * in localStorage.
 *
 * @module lib/storage
 */

import { type AppState, isAppState, createDefaultAppState } from '../types/models';

/**
 * LocalStorage key for storing application state.
 * Namespaced to avoid conflicts with other applications.
 * Exported for use in E2E tests to ensure consistency.
 */
export const STORAGE_KEY = 'BROTEINBUDDY_APP_STATE';

/**
 * Loads application state from localStorage.
 *
 * Attempts to retrieve and validate stored state. If the stored data is corrupted,
 * invalid, or missing, returns a fresh default state instead. This ensures the
 * application always starts with valid data.
 *
 * @returns Valid AppState object (either loaded from storage or default)
 *
 * @example
 * ```typescript
 * // On application startup
 * const state = loadState();
 * console.log(`Loaded ${state.boxes.length} boxes`);
 * ```
 *
 * @remarks
 * Error handling:
 * - Missing data → Returns default state
 * - Corrupted JSON → Logs warning, returns default state
 * - Invalid schema → Logs warning, returns default state
 * - localStorage unavailable → Returns default state
 * - Old schema version → Migrates to current version
 */
export function loadState(): AppState {
  try {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available, using default state');
      return createDefaultAppState();
    }

    // Retrieve stored data
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      // No data stored yet, use default
      return createDefaultAppState();
    }

    // Parse JSON
    const parsed: unknown = JSON.parse(stored);

    // Run migration if needed (will validate schema version)
    const migrated = migrateState(parsed);

    // Validate schema
    if (!isAppState(migrated)) {
      console.warn('Stored data failed validation, using default state');
      return createDefaultAppState();
    }

    return migrated;
  } catch (error) {
    // Handle JSON parse errors, unexpected exceptions
    console.warn('Failed to load state from localStorage:', error);
    return createDefaultAppState();
  }
}

/**
 * Saves application state to localStorage.
 *
 * Validates the state before saving to ensure data integrity. Handles quota
 * exceeded errors by throwing an exception that the caller should handle
 * (e.g., notify user to free up storage).
 *
 * @param state - The application state to save
 * @throws {Error} If state validation fails (invalid data structure)
 * @throws {DOMException} If localStorage quota is exceeded
 *
 * @example
 * ```typescript
 * try {
 *   saveState(updatedState);
 * } catch (error) {
 *   if (error instanceof DOMException && error.name === 'QuotaExceededError') {
 *     alert('Storage full! Please free up space.');
 *   }
 * }
 * ```
 *
 * @remarks
 * Validation ensures:
 * - State conforms to AppState schema
 * - All boxes and flavors are valid
 * - References are consistent
 */
export function saveState(state: AppState): void {
  // Validate before saving
  if (!isAppState(state)) {
    throw new Error('Cannot save invalid state: schema validation failed');
  }

  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('LocalStorage quota exceeded');
      throw error; // Re-throw for caller to handle
    }
    console.error('Failed to save state to localStorage:', error);
    throw error;
  }
}

/**
 * Clears all application state from localStorage.
 *
 * Useful for testing, resetting the application, or implementing
 * "clear all data" functionality.
 *
 * @example
 * ```typescript
 * // Reset application to fresh state
 * clearState();
 * const state = loadState(); // Returns default state
 * ```
 */
export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear state from localStorage:', error);
  }
}

/**
 * Migrates state data from older schema versions to the current version.
 *
 * This function handles schema evolution over time. When the application's
 * data model changes (e.g., new fields added, old fields removed), this
 * function transforms old data to match the current schema.
 *
 * Migrations are chained: a v1 payload runs through v1→v2 then v2→v3 in a
 * single call. The function is idempotent — a payload already at the current
 * version is returned unchanged.
 *
 * @param data - Raw data loaded from localStorage (unknown type)
 * @returns Migrated data compatible with current schema
 *
 * @remarks
 * Current schema version: 3
 *
 * Migration path:
 * - Version 1 → 2: Replace `excludeFromRandom: boolean` with `randomPool: RandomPool | null`
 *   - `excludeFromRandom: false` → `randomPool: 'caffeine-free'`
 *   - `excludeFromRandom: true` → `randomPool: null`
 * - Version 2 → 3: Add empty `events: []` timeline. Existing boxes are
 *   not backfilled with synthetic `box_received` events because their true
 *   receive dates are unknown.
 */
export function migrateState(data: unknown): unknown {
  if (typeof data !== 'object' || data === null || !('version' in data)) {
    return data;
  }

  let current = data as Record<string, unknown> & { version: number };

  if (current.version === 1 && Array.isArray(current.flavors)) {
    const migratedFlavors = current.flavors.map((f: unknown) => {
      const flavor = f as Record<string, unknown>;
      const { excludeFromRandom, ...rest } = flavor;
      return {
        ...rest,
        randomPool: excludeFromRandom ? null : 'caffeine-free',
      };
    });

    current = {
      ...current,
      version: 2,
      flavors: migratedFlavors,
    };
  }

  if (current.version === 2) {
    current = {
      ...current,
      version: 3,
      events: [],
    };
  }

  return current;
}
