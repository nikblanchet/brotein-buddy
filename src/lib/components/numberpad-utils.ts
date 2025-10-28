/**
 * NumberPad Utilities
 *
 * Helper functions for the NumberPad component, exported separately
 * for easier unit testing.
 */

export interface NumberPadProps {
  onselect: (value: number | 'keyboard') => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

/**
 * Generates an array of numbers from min to max (inclusive)
 *
 * @param min - The minimum number (inclusive)
 * @param max - The maximum number (inclusive)
 * @returns Array of numbers in the range
 *
 * @example
 * ```ts
 * generateNumberRange(1, 12) // [1, 2, 3, ..., 12]
 * generateNumberRange(0, 5) // [0, 1, 2, 3, 4, 5]
 * generateNumberRange(5, 5) // [5]
 * ```
 */
export function generateNumberRange(min: number, max: number): number[] {
  if (min > max) {
    return [];
  }

  const range: number[] = [];
  for (let i = min; i <= max; i++) {
    range.push(i);
  }

  return range;
}

/**
 * Determines if a value is within the valid range
 *
 * @param value - The value to check
 * @param min - The minimum value (inclusive)
 * @param max - The maximum value (inclusive)
 * @returns Whether the value is within range
 *
 * @example
 * ```ts
 * isInRange(5, 1, 12) // true
 * isInRange(0, 1, 12) // false
 * isInRange(13, 1, 12) // false
 * ```
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Calculates the number of rows needed for the grid
 *
 * @param count - Total number of items
 * @param columns - Number of columns in the grid
 * @returns Number of rows needed
 *
 * @example
 * ```ts
 * calculateRows(12, 3) // 4 (12 items in 3 columns = 4 rows)
 * calculateRows(10, 3) // 4 (10 items in 3 columns = 4 rows, last row partial)
 * calculateRows(9, 3) // 3 (9 items in 3 columns = 3 rows)
 * ```
 */
export function calculateRows(count: number, columns: number): number {
  return Math.ceil(count / columns);
}
