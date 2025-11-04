import type { Box, Location } from './types/models';
import { validateLocationNoGaps } from './utils/location-validation';

/**
 * Simulates moving a box to a new location without committing to state.
 * Returns a new boxes array with the move applied.
 *
 * @param boxes - Current boxes array
 * @param boxId - ID of box to move
 * @param newLocation - Target location
 * @returns New boxes array with simulated move
 *
 * @example
 * ```typescript
 * const updated = simulateMove(boxes, 'box-1', { stack: 2, height: 3 });
 * // boxes[0] remains unchanged (immutable)
 * // updated[0] has new location { stack: 2, height: 3 }
 * ```
 */
export function simulateMove(boxes: Box[], boxId: string, newLocation: Location): Box[] {
  return boxes.map((box) => (box.id === boxId ? { ...box, location: { ...newLocation } } : box));
}

/**
 * Reorders boxes after a move, handling any cascading updates.
 * For simple drag-and-drop (one box at a time), this is typically just the moved box.
 *
 * @param boxes - Current boxes array
 * @param boxId - ID of box being moved
 * @param newLocation - Target location
 * @returns Array of boxes with updated locations
 *
 * @example
 * ```typescript
 * const reordered = reorderBoxesAfterMove(boxes, 'box-1', { stack: 2, height: 1 });
 * // Returns boxes array with box-1 at new location
 * ```
 */
export function reorderBoxesAfterMove(boxes: Box[], boxId: string, newLocation: Location): Box[] {
  // For Task 2.7, we're moving one box at a time with no auto-rearrangement
  // Just update the moved box's location
  return simulateMove(boxes, boxId, newLocation);
}

/**
 * Gets all boxes that would be affected by moving a box to a new location.
 * For simple moves, this is just the moved box itself.
 *
 * @param boxes - Current boxes array
 * @param boxId - ID of box being moved
 * @param newLocation - Target location
 * @returns Array of box IDs affected by the move
 *
 * @example
 * ```typescript
 * const affected = getAffectedBoxes(boxes, 'box-1', { stack: 2, height: 3 });
 * // Returns: ['box-1']
 * ```
 */
export function getAffectedBoxes(boxes: Box[], boxId: string, _newLocation: Location): string[] {
  // For simple moves, only the moved box is affected
  // Future enhancement: if we add cascading rearrangements, this would include displaced boxes
  return [boxId];
}

/**
 * Validates the entire rearrangement state to ensure no floating boxes.
 * Checks all boxes for gaps in stack numbers and height positions.
 *
 * @param boxes - Boxes array to validate
 * @returns Validation result with any errors found
 *
 * @example
 * ```typescript
 * const result = validateRearrangementState(boxes);
 * if (!result.isValid) {
 *   console.log('Errors:', result.errors);
 *   // Errors: ['box-2: Cannot have gap in height - height 3 requires heights 1 and 2']
 * }
 * ```
 */
export function validateRearrangementState(boxes: Box[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check each box for gaps using existing validation utility
  for (const box of boxes) {
    const validation = validateLocationNoGaps(
      box.location.stack,
      box.location.height,
      boxes,
      box.id // exclude the box being validated
    );

    if (!validation.isValid && validation.error) {
      errors.push(`${box.id}: ${validation.error}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
