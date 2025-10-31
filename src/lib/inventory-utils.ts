/**
 * Utility functions for inventory management
 *
 * These functions handle data transformations and calculations
 * for the Inventory component, extracted for testability.
 *
 * @module lib/inventory-utils
 */

import type { Box, Flavor } from '../types/models';

/**
 * Maximum hue value for HSL color generation (degrees in color wheel)
 */
const COLOR_HUE_MAX = 360;

/**
 * Saturation percentage for generated flavor colors
 */
const COLOR_SATURATION = 65;

/**
 * Lightness percentage for generated flavor colors
 */
const COLOR_LIGHTNESS = 55;

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

/**
 * Sort column type for table sorting
 */
export type SortColumn = 'flavor' | 'quantity' | 'location';

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sorts boxes with flavor information by the specified column and direction
 *
 * @param boxesWithFlavors - Array of boxes with their flavor information
 * @param sortColumn - Column to sort by
 * @param sortDirection - Direction to sort (ascending or descending)
 * @returns Sorted array of boxes with flavors
 *
 * @example
 * ```typescript
 * const boxes = [
 *   { box: { quantity: 10, ... }, flavor: { name: 'Chocolate' } },
 *   { box: { quantity: 5, ... }, flavor: { name: 'Vanilla' } },
 * ];
 * const sorted = sortBoxes(boxes, 'quantity', 'desc');
 * // Returns boxes sorted by quantity descending: [10, 5]
 * ```
 */
export function sortBoxes(
  boxesWithFlavors: BoxWithFlavor[],
  sortColumn: SortColumn,
  sortDirection: SortDirection
): BoxWithFlavor[] {
  const data = [...boxesWithFlavors];

  data.sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case 'flavor': {
        const nameA = a.flavor?.name || 'Unknown';
        const nameB = b.flavor?.name || 'Unknown';
        comparison = nameA.localeCompare(nameB);
        break;
      }
      case 'quantity':
        comparison = a.box.quantity - b.box.quantity;
        break;

      case 'location':
        // Sort by stack first, then height
        comparison = a.box.location.stack - b.box.location.stack;
        if (comparison === 0) {
          comparison = a.box.location.height - b.box.location.height;
        }
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return data;
}

/**
 * Generates a consistent color for a flavor based on its ID
 *
 * Uses a simple hash function to generate a deterministic HSL color
 * with good saturation and lightness for visibility.
 *
 * @param flavorId - The flavor ID to generate a color for
 * @returns HSL color string (e.g., "hsl(120, 65%, 55%)")
 *
 * @example
 * ```typescript
 * const color1 = getFlavorColor('flavor_chocolate');
 * const color2 = getFlavorColor('flavor_chocolate');
 * // color1 === color2 (consistent hashing)
 * ```
 */
export function getFlavorColor(flavorId: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < flavorId.length; i++) {
    hash = flavorId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate HSL color with good saturation and lightness
  const hue = Math.abs(hash % COLOR_HUE_MAX);
  return `hsl(${hue}, ${COLOR_SATURATION}%, ${COLOR_LIGHTNESS}%)`;
}

/**
 * Formats a location for display
 *
 * @param stack - Stack number
 * @param height - Height within stack
 * @returns Formatted location string
 *
 * @example
 * ```typescript
 * formatLocation(1, 2);
 * // Returns: "Stack 1, Height 2"
 * ```
 */
export function formatLocation(stack: number, height: number): string {
  return `Stack ${stack}, Height ${height}`;
}
