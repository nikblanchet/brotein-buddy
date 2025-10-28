/**
 * Flavor utility functions for safe flavor lookup and manipulation.
 *
 * @module lib/utils/flavor
 */

import type { Flavor } from '../../types/models';

/**
 * Safely retrieve a flavor by ID from an array of flavors.
 *
 * Returns null if the flavor ID is null/undefined or if no matching
 * flavor is found in the array. This function is defensive and handles
 * edge cases gracefully without throwing errors.
 *
 * @param flavorId - The flavor ID to look up (can be null/undefined)
 * @param flavors - Array of flavors to search through
 * @returns The matching flavor if found, null otherwise
 *
 * @example
 * ```typescript
 * const flavors: Flavor[] = [
 *   { id: 'choc', name: 'Chocolate', excludeFromRandom: false },
 *   { id: 'van', name: 'Vanilla', excludeFromRandom: false }
 * ];
 *
 * // Found
 * const flavor = maybeGetFlavor('choc', flavors);
 * // flavor = { id: 'choc', name: 'Chocolate', excludeFromRandom: false }
 *
 * // Not found
 * const missing = maybeGetFlavor('strawberry', flavors);
 * // missing = null
 *
 * // Null ID
 * const empty = maybeGetFlavor(null, flavors);
 * // empty = null
 * ```
 *
 * @remarks
 * - Returns null for any falsy flavorId (null, undefined, empty string)
 * - Returns null if flavors array is null/undefined
 * - Case-sensitive ID matching
 * - Time complexity: O(n) where n is the number of flavors
 */
export function maybeGetFlavor(
  flavorId: string | null | undefined,
  flavors: Flavor[]
): Flavor | null {
  // Handle null/undefined/empty flavor ID
  if (!flavorId) {
    return null;
  }

  // Handle null/undefined flavors array
  if (!Array.isArray(flavors)) {
    return null;
  }

  // Find matching flavor
  return flavors.find((f) => f.id === flavorId) ?? null;
}
