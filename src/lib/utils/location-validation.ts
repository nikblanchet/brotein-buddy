import type { Box, Location } from '../../types/models';

/**
 * Validates that a location has no gaps in stacks or heights.
 *
 * Rules:
 * - Stack N requires non-empty stacks 1 through N-1
 * - Height H in a stack requires heights 1 through H-1 in that stack
 * - No floating boxes or gaps allowed
 *
 * @param stack - The stack (column) number to validate
 * @param height - The height (row) number to validate
 * @param allBoxes - All boxes in the inventory
 * @param excludeBoxId - Optional box ID to exclude from validation (for moves)
 * @returns Validation result with isValid flag and error message if invalid
 *
 * @example
 * ```typescript
 * // Valid: Moving to stack 1, height 1 (first box)
 * validateLocationNoGaps(1, 1, []); // { isValid: true }
 *
 * // Invalid: Moving to stack 3 when stack 2 is empty
 * validateLocationNoGaps(3, 1, [box1InStack1]);
 * // { isValid: false, error: "Stack 3 requires non-empty stack 2" }
 *
 * // Invalid: Moving to height 3 when height 2 doesn't exist in that stack
 * validateLocationNoGaps(1, 3, [box1AtHeight1]);
 * // { isValid: false, error: "Height 3 in stack 1 requires height 2" }
 * ```
 */
export function validateLocationNoGaps(
  stack: number,
  height: number,
  allBoxes: Box[],
  excludeBoxId?: string
): { isValid: boolean; error?: string } {
  // Filter out the box being moved (if any)
  const boxes = excludeBoxId ? allBoxes.filter((b) => b.id !== excludeBoxId) : allBoxes;

  // Validate positive integers
  if (stack < 1 || !Number.isInteger(stack)) {
    return { isValid: false, error: 'Stack must be a positive integer' };
  }
  if (height < 1 || !Number.isInteger(height)) {
    return { isValid: false, error: 'Height must be a positive integer' };
  }

  // Check for gaps in stacks (stack N requires stacks 1..N-1)
  if (stack > 1) {
    const requiredStacks = new Set(Array.from({ length: stack - 1 }, (_, i) => i + 1));
    const occupiedStacks = new Set(boxes.map((b) => b.location.stack));

    for (const requiredStack of requiredStacks) {
      if (!occupiedStacks.has(requiredStack)) {
        return {
          isValid: false,
          error: `Stack ${stack} requires non-empty stack ${requiredStack}`,
        };
      }
    }
  }

  // Check for gaps in heights within this stack (height H requires heights 1..H-1)
  if (height > 1) {
    const boxesInStack = boxes.filter((b) => b.location.stack === stack);
    const occupiedHeights = new Set(boxesInStack.map((b) => b.location.height));

    for (let requiredHeight = 1; requiredHeight < height; requiredHeight++) {
      if (!occupiedHeights.has(requiredHeight)) {
        return {
          isValid: false,
          error: `Height ${height} in stack ${stack} requires height ${requiredHeight}`,
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Finds a box that conflicts with the given location.
 *
 * @param stack - The stack to check
 * @param height - The height to check
 * @param allBoxes - All boxes in the inventory
 * @param excludeBoxId - Optional box ID to exclude from conflict check (for moves)
 * @returns The conflicting box, or null if no conflict
 *
 * @example
 * ```typescript
 * const conflict = getLocationConflict(1, 2, allBoxes);
 * if (conflict) {
 *   console.log(`Location occupied by box ${conflict.id}`);
 * }
 * ```
 */
export function getLocationConflict(
  stack: number,
  height: number,
  allBoxes: Box[],
  excludeBoxId?: string
): Box | null {
  const boxes = excludeBoxId ? allBoxes.filter((b) => b.id !== excludeBoxId) : allBoxes;

  return boxes.find((b) => b.location.stack === stack && b.location.height === height) || null;
}

/**
 * Gets all currently valid locations that can be occupied without creating gaps.
 *
 * Returns an array of locations where boxes can be placed following the no-gaps rule:
 * - Each stack can have a new box at height = (current max height + 1)
 * - A new stack can be created if it's the next sequential stack number
 *
 * @param allBoxes - All boxes in the inventory
 * @param excludeBoxId - Optional box ID to exclude (for finding valid move destinations)
 * @returns Array of valid locations
 *
 * @example
 * ```typescript
 * const validLocations = getValidLocations(allBoxes);
 * // Returns: [{ stack: 1, height: 3 }, { stack: 2, height: 2 }, { stack: 3, height: 1 }]
 * // Meaning: Can add to top of stack 1, top of stack 2, or start new stack 3
 * ```
 */
export function getValidLocations(allBoxes: Box[], excludeBoxId?: string): Location[] {
  const boxes = excludeBoxId ? allBoxes.filter((b) => b.id !== excludeBoxId) : allBoxes;

  const validLocations: Location[] = [];

  if (boxes.length === 0) {
    // First box must go at stack 1, height 1
    return [{ stack: 1, height: 1 }];
  }

  // Get max stack number
  const maxStack = Math.max(...boxes.map((b) => b.location.stack));

  // For each existing stack, can add to top (max height + 1)
  for (let stack = 1; stack <= maxStack; stack++) {
    const boxesInStack = boxes.filter((b) => b.location.stack === stack);
    const maxHeight = Math.max(...boxesInStack.map((b) => b.location.height));
    validLocations.push({ stack, height: maxHeight + 1 });
  }

  // Can create new stack (next sequential stack number) at height 1
  validLocations.push({ stack: maxStack + 1, height: 1 });

  return validLocations;
}

/**
 * Suggests the next available location for a new box.
 *
 * Priority order:
 * 1. Top of existing stacks (prefer lower stack numbers)
 * 2. New stack if all existing stacks are full
 *
 * @param allBoxes - All boxes in the inventory
 * @returns The suggested location, or { stack: 1, height: 1 } if inventory is empty
 *
 * @example
 * ```typescript
 * const nextLocation = suggestNextLocation(allBoxes);
 * // Returns: { stack: 1, height: 4 } // Add to top of first stack
 * ```
 */
export function suggestNextLocation(allBoxes: Box[]): Location {
  const validLocations = getValidLocations(allBoxes);

  if (validLocations.length === 0 || allBoxes.length === 0) {
    return { stack: 1, height: 1 };
  }

  // Prefer adding to existing stacks (lower stack numbers first)
  return validLocations[0];
}

/**
 * Formats a location as a human-readable string.
 *
 * The "Stack N · Row H" wording matches the 2026 UX refresh - "Row" is
 * what users actually see on the physical shelf and the middle dot
 * separator avoids the comma-dot ambiguity that "Stack 1, 2" can
 * introduce when the two numbers are adjacent in copy.
 *
 * @param stack - The stack number
 * @param height - The row number (height index, 1 at the bottom)
 * @returns Formatted string like "Stack 1 · Row 3"
 *
 * @example
 * ```typescript
 * formatLocation(1, 3); // "Stack 1 · Row 3"
 * ```
 */
export function formatLocation(stack: number, height: number): string {
  return `Stack ${stack} · Row ${height}`;
}

/**
 * Checks if a location can be used for swapping (no gaps after swap).
 *
 * When swapping two boxes, we need to ensure that neither location
 * will create gaps after the swap.
 *
 * @param location1 - First location
 * @param location2 - Second location
 * @param allBoxes - All boxes in the inventory
 * @param box1Id - ID of box at location1
 * @param box2Id - ID of box at location2
 * @returns True if swap is valid (no gaps created)
 *
 * @example
 * ```typescript
 * const canSwap = canSwapLocations(
 *   { stack: 1, height: 2 },
 *   { stack: 2, height: 1 },
 *   allBoxes,
 *   'box1',
 *   'box2'
 * );
 * ```
 */
export function canSwapLocations(
  location1: Location,
  location2: Location,
  allBoxes: Box[],
  box1Id: string,
  box2Id: string
): boolean {
  // Create a simulated state after swap
  const boxesAfterSwap = allBoxes.map((b) => {
    if (b.id === box1Id) {
      return { ...b, location: location2 };
    }
    if (b.id === box2Id) {
      return { ...b, location: location1 };
    }
    return b;
  });

  // Check if both locations are still valid (no gaps created)
  const location1Valid = validateLocationNoGaps(location1.stack, location1.height, boxesAfterSwap);
  const location2Valid = validateLocationNoGaps(location2.stack, location2.height, boxesAfterSwap);

  return location1Valid.isValid && location2Valid.isValid;
}
