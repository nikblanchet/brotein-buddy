/**
 * Inventory table sorting utilities
 *
 * Sorting logic for the inventory table view, extracted
 * for testability and separation from data queries.
 *
 * @module lib/utils/inventory-sort
 */

import type { BoxWithFlavor } from '../inventory-utils';

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
