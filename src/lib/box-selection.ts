/**
 * Box priority selection algorithm for BroteinBuddy.
 *
 * This module implements the logic for selecting which box to use when multiple
 * boxes of the same flavor exist. The selection follows a priority system to
 * ensure optimal inventory rotation.
 *
 * @module lib/box-selection
 */

import type { Box } from '../types/models';

/**
 * Selects the highest priority box for a given flavor.
 *
 * When multiple boxes of the same flavor exist, this function determines which
 * box should be used first based on the following priority rules:
 *
 * 1. Open boxes before unopened boxes (use what's already started)
 * 2. Lower quantity before higher quantity (finish boxes that are nearly empty)
 * 3. Higher stack position before lower position (use more accessible boxes)
 *
 * @param boxes - Array of all boxes in inventory
 * @param flavorId - The ID of the flavor to select a box for
 * @returns The highest priority box for the flavor, or null if no boxes exist
 *
 * @example
 * ```typescript
 * const boxes: Box[] = [
 *   {
 *     id: 'box1',
 *     flavorId: 'chocolate',
 *     quantity: 8,
 *     location: { stack: 1, height: 0 },
 *     isOpen: false
 *   },
 *   {
 *     id: 'box2',
 *     flavorId: 'chocolate',
 *     quantity: 3,
 *     location: { stack: 2, height: 1 },
 *     isOpen: true
 *   }
 * ];
 *
 * // Returns box2 because it's open (open boxes have priority)
 * const selectedBox = selectPriorityBox(boxes, 'chocolate');
 * ```
 *
 * @example
 * ```typescript
 * // No boxes of the flavor
 * const boxes: Box[] = [
 *   { id: 'box1', flavorId: 'vanilla', quantity: 12, location: { stack: 1, height: 0 }, isOpen: false }
 * ];
 *
 * // Returns null - no chocolate boxes
 * const selectedBox = selectPriorityBox(boxes, 'chocolate');
 * ```
 *
 * @example
 * ```typescript
 * // Multiple open boxes - selects lowest quantity
 * const boxes: Box[] = [
 *   { id: 'box1', flavorId: 'chocolate', quantity: 8, location: { stack: 1, height: 0 }, isOpen: true },
 *   { id: 'box2', flavorId: 'chocolate', quantity: 3, location: { stack: 2, height: 1 }, isOpen: true }
 * ];
 *
 * // Returns box2 (quantity 3) - both open, so lower quantity wins
 * const selectedBox = selectPriorityBox(boxes, 'chocolate');
 * ```
 *
 * @example
 * ```typescript
 * // Same quantity - selects higher position
 * const boxes: Box[] = [
 *   { id: 'box1', flavorId: 'chocolate', quantity: 6, location: { stack: 1, height: 0 }, isOpen: true },
 *   { id: 'box2', flavorId: 'chocolate', quantity: 6, location: { stack: 2, height: 2 }, isOpen: true }
 * ];
 *
 * // Returns box2 - same quantity, so higher position (height: 2) wins
 * const selectedBox = selectPriorityBox(boxes, 'chocolate');
 * ```
 */
export function selectPriorityBox(
  boxes: Box[],
  flavorId: string,
): Box | null {
  // Filter to only boxes of the requested flavor
  const matchingBoxes = boxes.filter((box) => box.flavorId === flavorId);

  // Return null if no boxes match
  if (matchingBoxes.length === 0) {
    return null;
  }

  // Sort by priority rules
  const sortedBoxes = matchingBoxes.sort((a, b) => {
    // Rule 1: Open boxes before unopened
    // isOpen: true should come before isOpen: false
    // Convert boolean to number: true = 1, false = 0
    // Sort descending (1 before 0), so b - a
    if (a.isOpen !== b.isOpen) {
      return (b.isOpen ? 1 : 0) - (a.isOpen ? 1 : 0);
    }

    // Rule 2: Lower quantity before higher
    // Sort ascending (smaller numbers first)
    if (a.quantity !== b.quantity) {
      return a.quantity - b.quantity;
    }

    // Rule 3: Higher stack position before lower
    // Sort descending (higher numbers first)
    return b.location.height - a.location.height;
  });

  // Return the highest priority box (first in sorted list)
  return sortedBoxes[0];
}
