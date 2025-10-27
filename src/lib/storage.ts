/**
 * LocalStorage abstraction layer for BroteinBuddy application state.
 *
 * Provides functions to persist and retrieve application state from browser localStorage
 * with validation, error handling, and migration support.
 *
 * @module lib/storage
 */

import { type AppState, isAppState, createDefaultAppState } from '../types/models';

/**
 * LocalStorage key for storing application state.
 * Namespaced to avoid conflicts with other applications.
 */
const STORAGE_KEY = 'BROTEINBUDDY_APP_STATE';

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
 * @param data - Raw data loaded from localStorage (unknown type)
 * @returns Migrated data compatible with current schema
 *
 * @remarks
 * Current schema version: 1
 * Migration path:
 * - Version 1: Current version, no migration needed
 * - Future versions: Add migration logic here
 *
 * @example
 * ```typescript
 * // Future migration example (when v2 is added):
 * if (data.version === 1) {
 *   // Transform v1 to v2
 *   return {
 *     ...data,
 *     version: 2,
 *     newField: defaultValue
 *   };
 * }
 * ```
 */
function migrateState(data: unknown): unknown {
  // For v1, no migrations exist yet
  // Simply return the data as-is for validation
  // Future versions will add migration logic here

  // Example structure for future migrations:
  // if (typeof data === 'object' && data !== null && 'version' in data) {
  //   const versioned = data as { version: number };
  //   if (versioned.version === 1) {
  //     // Migrate from v1 to v2
  //     return { ...data, version: 2, newField: defaultValue };
  //   }
  // }

  return data;
}
