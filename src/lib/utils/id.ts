/**
 * ID generation utilities
 *
 * Centralized functions for generating unique identifiers for
 * boxes, flavors, and other entities in the application.
 *
 * @module lib/utils/id
 */

/**
 * Generates a unique ID for a new flavor
 *
 * Uses timestamp-based ID generation for simplicity.
 * Can be easily switched to UUID or nanoid if needed.
 *
 * @returns Unique flavor ID string (format: "flavor_{timestamp}")
 *
 * @example
 * ```typescript
 * const newFlavorId = generateFlavorId();
 * // Returns: "flavor_1698765432100"
 * ```
 */
export function generateFlavorId(): string {
  return `flavor_${Date.now()}`;
}

/**
 * Generates a unique ID for a new box
 *
 * Uses timestamp-based ID generation for simplicity.
 * Can be easily switched to UUID or nanoid if needed.
 *
 * @returns Unique box ID string (format: "box_{timestamp}")
 *
 * @example
 * ```typescript
 * const newBoxId = generateBoxId();
 * // Returns: "box_1698765432100"
 * ```
 */
export function generateBoxId(): string {
  return `box_${Date.now()}`;
}
