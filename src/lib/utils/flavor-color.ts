/**
 * Deterministic color generation for flavors
 *
 * Generates consistent HSL colors based on flavor IDs using
 * a simple hash function. Used for visual differentiation
 * in inventory displays.
 *
 * @module lib/utils/flavor-color
 */

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
