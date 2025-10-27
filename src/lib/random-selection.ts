/**
 * Random flavor selection algorithm with weighted probability.
 *
 * This module implements weighted random selection where flavors with more
 * total quantity (across all boxes) have proportionally higher probability
 * of being selected.
 *
 * @module lib/random-selection
 */

import type { AppState, Flavor } from '../types/models';

/**
 * Selects a random flavor using weighted probability based on total quantity.
 *
 * The selection algorithm:
 * 1. Calculates total quantity for each flavor across all boxes
 * 2. Filters out flavors that are:
 *    - Marked as excludeFromRandom
 *    - Have zero total quantity
 *    - Match the excludeLastPick parameter (if provided)
 * 3. Uses weighted random selection where probability is proportional to quantity
 * 4. Returns the selected flavor, or null if no valid flavors exist
 *
 * @param state - The complete application state containing boxes and flavors
 * @param excludeLastPick - Optional flavor ID to exclude (prevents consecutive repeats)
 * @returns The selected flavor, or null if no valid flavors available
 *
 * @example
 * ```typescript
 * const state: AppState = {
 *   version: 1,
 *   flavors: [
 *     { id: 'chocolate', name: 'Chocolate', excludeFromRandom: false },
 *     { id: 'vanilla', name: 'Vanilla', excludeFromRandom: false },
 *     { id: 'strawberry', name: 'Strawberry', excludeFromRandom: true }
 *   ],
 *   boxes: [
 *     { id: 'b1', flavorId: 'chocolate', quantity: 8, location: {...}, isOpen: true },
 *     { id: 'b2', flavorId: 'chocolate', quantity: 12, location: {...}, isOpen: false },
 *     { id: 'b3', flavorId: 'vanilla', quantity: 5, location: {...}, isOpen: true }
 *   ],
 *   favoriteFlavorId: null,
 *   settings: {}
 * };
 *
 * // Chocolate has 20 total quantity (8 + 12), vanilla has 5
 * // Chocolate has 20/25 = 80% chance, vanilla has 5/25 = 20% chance
 * // Strawberry is excluded due to excludeFromRandom flag
 * const selected = selectRandomFlavor(state);
 *
 * // Avoid selecting the same flavor twice in a row
 * const firstPick = selectRandomFlavor(state);
 * const secondPick = selectRandomFlavor(state, firstPick?.id);
 * // secondPick will never equal firstPick
 * ```
 *
 * @example
 * ```typescript
 * // Returns null when no valid flavors
 * const emptyState: AppState = {
 *   version: 1,
 *   flavors: [{ id: 'f1', name: 'Test', excludeFromRandom: true }],
 *   boxes: [],
 *   favoriteFlavorId: null,
 *   settings: {}
 * };
 * const result = selectRandomFlavor(emptyState); // null
 * ```
 *
 * @remarks
 * Weighting algorithm:
 * - Each flavor's probability = (total quantity) / (sum of all valid quantities)
 * - Uses Math.random() for selection
 * - Time complexity: O(n + m) where n = boxes, m = flavors
 * - Space complexity: O(m) for quantity map
 */
export function selectRandomFlavor(state: AppState, excludeLastPick?: string): Flavor | null {
  // Step 1: Calculate total quantity for each flavor
  const quantityByFlavorId = new Map<string, number>();

  for (const box of state.boxes) {
    const currentQty = quantityByFlavorId.get(box.flavorId) || 0;
    quantityByFlavorId.set(box.flavorId, currentQty + box.quantity);
  }

  // Step 2: Filter flavors to only include valid candidates
  const validFlavors = state.flavors.filter((flavor) => {
    // Exclude if user has marked it as excluded
    if (flavor.excludeFromRandom) {
      return false;
    }

    // Exclude if it matches the last pick (prevent consecutive repeats)
    if (excludeLastPick !== undefined && flavor.id === excludeLastPick) {
      return false;
    }

    // Exclude if total quantity is zero (out of stock)
    const totalQty = quantityByFlavorId.get(flavor.id) || 0;
    if (totalQty === 0) {
      return false;
    }

    return true;
  });

  // Step 3: Return null if no valid flavors
  if (validFlavors.length === 0) {
    return null;
  }

  // Step 4: Calculate total weight (sum of all valid quantities)
  const totalWeight = validFlavors.reduce((sum, flavor) => {
    return sum + (quantityByFlavorId.get(flavor.id) || 0);
  }, 0);

  // Step 5: Weighted random selection
  // Generate random number between 0 and totalWeight
  let randomValue = Math.random() * totalWeight;

  // Walk through flavors, subtracting their weight from randomValue
  // until we go negative (that's our selection)
  for (const flavor of validFlavors) {
    const weight = quantityByFlavorId.get(flavor.id) || 0;
    randomValue -= weight;

    if (randomValue <= 0) {
      return flavor;
    }
  }

  // Fallback (should never reach here due to floating point precision)
  // Return the last valid flavor
  return validFlavors[validFlavors.length - 1];
}
