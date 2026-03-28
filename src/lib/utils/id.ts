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
 * Uses crypto.randomUUID() for collision-resistant ID generation.
 *
 * @returns Unique flavor ID string (format: "flavor_{uuid}")
 *
 * @example
 * ```typescript
 * const newFlavorId = generateFlavorId();
 * // Returns: "flavor_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * ```
 */
export function generateFlavorId(): string {
  return `flavor_${crypto.randomUUID()}`;
}

/**
 * Generates a unique ID for a new box
 *
 * Uses crypto.randomUUID() for collision-resistant ID generation.
 *
 * @returns Unique box ID string (format: "box_{uuid}")
 *
 * @example
 * ```typescript
 * const newBoxId = generateBoxId();
 * // Returns: "box_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * ```
 */
export function generateBoxId(): string {
  return `box_${crypto.randomUUID()}`;
}
