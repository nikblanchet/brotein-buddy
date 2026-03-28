/**
 * Utility functions for inventory data queries
 *
 * Pure data transformations for grouping and querying inventory state.
 *
 * @module lib/inventory-utils
 */

import type { Box, Flavor } from '../types/models';

/**
 * Box with flavor information attached
 */
export interface BoxWithFlavor {
  box: Box;
  flavor: Flavor | null;
}

/**
 * Groups boxes by stack number and sorts by height within each stack
 *
 * @param boxesWithFlavors - Array of boxes with their flavor information
 * @returns Map of stack number to sorted boxes (sorted by height, 0 at bottom)
 *
 * @example
 * ```typescript
 * const boxes = [
 *   { box: { id: '1', location: { stack: 1, height: 0 }, ... }, flavor: ... },
 *   { box: { id: '2', location: { stack: 1, height: 1 }, ... }, flavor: ... },
 *   { box: { id: '3', location: { stack: 2, height: 0 }, ... }, flavor: ... },
 * ];
 * const grouped = groupBoxesByStack(boxes);
 * // Returns: Map { 1 => [box at height 0, box at height 1], 2 => [box at height 0] }
 * ```
 */
export function groupBoxesByStack(boxesWithFlavors: BoxWithFlavor[]): Map<number, BoxWithFlavor[]> {
  const grouped = new Map<number, BoxWithFlavor[]>();

  boxesWithFlavors.forEach((item) => {
    const stack = item.box.location.stack;
    if (!grouped.has(stack)) {
      grouped.set(stack, []);
    }
    grouped.get(stack)!.push(item);
  });

  // Sort each stack by height (0 at bottom)
  grouped.forEach((boxes) => {
    boxes.sort((a, b) => a.box.location.height - b.box.location.height);
  });

  // Sort stacks by stack number
  return new Map([...grouped.entries()].sort((a, b) => a[0] - b[0]));
}

/**
 * Finds flavors that have zero total inventory across all boxes
 *
 * @param flavors - All flavors in the system
 * @param boxes - All boxes in inventory
 * @returns Array of flavors with zero inventory
 *
 * @example
 * ```typescript
 * const flavors = [
 *   { id: 'f1', name: 'Chocolate', excludeFromRandom: false },
 *   { id: 'f2', name: 'Vanilla', excludeFromRandom: false },
 * ];
 * const boxes = [
 *   { id: 'b1', flavorId: 'f1', quantity: 5, ... },
 *   { id: 'b2', flavorId: 'f1', quantity: 0, ... },
 * ];
 * const outOfStock = getOutOfStockFlavors(flavors, boxes);
 * // Returns: [{ id: 'f2', name: 'Vanilla', ... }]
 * ```
 */
export function getOutOfStockFlavors(flavors: Flavor[], boxes: Box[]): Flavor[] {
  return flavors.filter((flavor) => {
    const totalQuantity = boxes
      .filter((box) => box.flavorId === flavor.id)
      .reduce((sum, box) => sum + box.quantity, 0);
    return totalQuantity === 0;
  });
}
