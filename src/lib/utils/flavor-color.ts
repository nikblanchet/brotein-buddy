/**
 * Curated flavor palette
 *
 * Replaces the legacy hash-to-HSL function with a hand-tuned 12-tone OKLCH
 * palette designed against the Cloud Dancer surface system. Each entry is a
 * {fill, accent, ink} triple so callers can paint a coherent box (fill bg,
 * accent strip + secondary text, ink primary text) from a single lookup.
 *
 * The 12 hues are evenly distributed at L=0.92 with low chroma so they read
 * as muted "stained paper" tints against the L=0.955 page background -
 * sophisticated, not candy. Accent tones at L=0.5 give text/strip contrast
 * without screaming.
 *
 * Hash collisions are accepted: with ~11 flavors and 12 entries, two
 * flavors will occasionally share a tone. The flavor name remains the
 * source of truth - the palette differentiates visually, not as an ID.
 *
 * @module lib/utils/flavor-color
 */

/**
 * Tone triple used to render a flavored box card or hero tile
 */
export type FlavorTone = {
  /** Box background - soft tinted cream */
  readonly fill: string;
  /** Left accent strip + secondary text - darker hued */
  readonly accent: string;
  /** Primary text on the fill - darkest hued */
  readonly ink: string;
};

/**
 * Twelve curated tones. Lightness on `fill` tracks `--surface-app` (L=0.92
 * against L=0.955 background). When the next Pantone Color of the Year
 * shifts the surface lightness, shift these `fill` lightness values too.
 */
export const PALETTE: readonly FlavorTone[] = [
  { fill: 'oklch(0.92 0.030 35)', accent: 'oklch(0.52 0.09 35)', ink: 'oklch(0.32 0.06 35)' }, // terracotta
  { fill: 'oklch(0.92 0.028 60)', accent: 'oklch(0.55 0.08 65)', ink: 'oklch(0.34 0.05 65)' }, // clay
  { fill: 'oklch(0.92 0.032 85)', accent: 'oklch(0.56 0.08 85)', ink: 'oklch(0.34 0.06 85)' }, // ochre
  { fill: 'oklch(0.92 0.026 115)', accent: 'oklch(0.50 0.07 120)', ink: 'oklch(0.30 0.05 120)' }, // moss
  { fill: 'oklch(0.92 0.022 150)', accent: 'oklch(0.50 0.06 150)', ink: 'oklch(0.30 0.04 150)' }, // sage
  { fill: 'oklch(0.92 0.022 175)', accent: 'oklch(0.50 0.06 180)', ink: 'oklch(0.30 0.04 180)' }, // fern
  { fill: 'oklch(0.92 0.022 205)', accent: 'oklch(0.50 0.06 210)', ink: 'oklch(0.30 0.04 210)' }, // mist
  { fill: 'oklch(0.92 0.022 240)', accent: 'oklch(0.50 0.06 240)', ink: 'oklch(0.30 0.04 240)' }, // slate
  { fill: 'oklch(0.92 0.026 265)', accent: 'oklch(0.50 0.07 265)', ink: 'oklch(0.30 0.05 265)' }, // periwinkle
  { fill: 'oklch(0.92 0.026 295)', accent: 'oklch(0.52 0.07 295)', ink: 'oklch(0.32 0.05 295)' }, // lavender
  { fill: 'oklch(0.92 0.028 325)', accent: 'oklch(0.52 0.08 325)', ink: 'oklch(0.32 0.06 325)' }, // mauve
  { fill: 'oklch(0.92 0.028 355)', accent: 'oklch(0.52 0.08 355)', ink: 'oklch(0.32 0.06 355)' }, // rose
] as const;

/**
 * Deterministic flavor tone lookup
 *
 * Mixes the string length into the seed before hashing so identical-prefix
 * names ("Chocolate" vs "Chocolate Wintermint") map to different starting
 * positions even before the per-character mix.
 *
 * @param flavorId - The flavor ID (or any stable string) to look up
 * @returns A {fill, accent, ink} triple from the curated palette
 *
 * @example
 * ```typescript
 * const tone = getFlavorTone('flavor_chocolate');
 * // {
 * //   fill: 'oklch(0.92 0.026 295)',
 * //   accent: 'oklch(0.52 0.07 295)',
 * //   ink: 'oklch(0.32 0.05 295)'
 * // }
 * ```
 */
export function getFlavorTone(flavorId: string): FlavorTone {
  let h = flavorId.length * 17;
  for (let i = 0; i < flavorId.length; i++) {
    h = (flavorId.charCodeAt(i) * 31 + (h << 5) - h) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/**
 * Legacy single-color shim for the duration of the migration commit.
 * Returns the tone's `fill` value so existing background-color consumers
 * keep compiling until they switch to the full FlavorTone API.
 *
 * @deprecated Use `getFlavorTone` and pick `.fill`, `.accent`, or `.ink`
 *             explicitly. Removed in the next commit.
 */
export function getFlavorColor(flavorId: string): string {
  return getFlavorTone(flavorId).fill;
}
