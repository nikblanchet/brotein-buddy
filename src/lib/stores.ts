/**
 * Svelte stores for reactive state management.
 *
 * Provides a central writable store for application state with automatic
 * persistence to LocalStorage. Action functions mutate the store immutably
 * and trigger reactive updates throughout the application.
 *
 * @module lib/stores
 */

import { writable, type Writable } from 'svelte/store';
import { loadState, saveState } from './storage';
import type { AppState } from '../types/models';

/**
 * Creates the application state store with auto-save functionality.
 *
 * Initializes the store from LocalStorage and sets up a subscription that
 * automatically saves all state changes back to LocalStorage.
 *
 * @returns Writable store containing the full application state
 *
 * @remarks
 * Auto-save strategy:
 * - Every state change triggers a save to LocalStorage
 * - Saves are synchronous (acceptable for small data size)
 * - Storage errors are logged but don't crash the app
 * - State updates succeed even if save fails
 */
function createAppStore(): Writable<AppState> {
  const initialState = loadState();
  const { subscribe, set, update } = writable<AppState>(initialState);

  // Auto-save to LocalStorage on every state change
  subscribe((state) => {
    try {
      saveState(state);
    } catch (error) {
      // Log error but don't crash app
      // State change has succeeded in memory even if save failed
      console.error('Failed to auto-save state:', error);
    }
  });

  return { subscribe, set, update };
}

/**
 * Central application state store.
 *
 * Contains all boxes, flavors, user preferences, and settings.
 * Automatically persists to LocalStorage on every change.
 *
 * @example
 * ```svelte
 * <script>
 *   import { appState } from '$lib/stores';
 * </script>
 *
 * <p>Total boxes: {$appState.boxes.length}</p>
 * ```
 */
export const appState = createAppStore();

/**
 * Reloads application state from LocalStorage.
 *
 * Useful for:
 * - Resetting to stored state (discarding unsaved changes)
 * - Refreshing after external changes
 * - Testing and development
 *
 * @example
 * ```typescript
 * // Reset to last saved state
 * loadStateFromStorage();
 * ```
 */
export function loadStateFromStorage(): void {
  appState.set(loadState());
}
