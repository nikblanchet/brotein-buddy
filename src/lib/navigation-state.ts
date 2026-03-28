/**
 * Ephemeral navigation state for cross-route data passing.
 *
 * NOT persisted to localStorage — lives only in memory.
 * Cleared when the app is closed or page is hard-refreshed.
 *
 * @module lib/navigation-state
 */

import { writable } from 'svelte/store';
import type { RandomPool } from '../types/models';

/**
 * The flavor ID selected for the random confirmation flow.
 * Set by Home.svelte or Random.svelte, consumed by RandomConfirm.svelte.
 */
export const selectedFlavorId = writable<string | null>(null);

/**
 * The random pool selected for the current random selection flow.
 * Set by Home.svelte, consumed by Random.svelte.
 */
export const selectedPool = writable<RandomPool | null>(null);

/**
 * Clear all navigation state. Call after consuming the state
 * or when navigating away without consuming.
 */
export function clearNavigationState(): void {
  selectedFlavorId.set(null);
  selectedPool.set(null);
}
