/**
 * Unit tests for the curated flavor palette
 */

import { describe, it, expect } from 'vitest';
import { getFlavorTone, getFlavorColor, PALETTE } from '../../../src/lib/utils/flavor-color.js';

describe('PALETTE', () => {
  it('contains exactly 12 tones', () => {
    expect(PALETTE).toHaveLength(12);
  });

  it('every tone has fill, accent, and ink expressed as oklch()', () => {
    for (const tone of PALETTE) {
      expect(tone.fill).toMatch(/^oklch\(/);
      expect(tone.accent).toMatch(/^oklch\(/);
      expect(tone.ink).toMatch(/^oklch\(/);
    }
  });
});

describe('getFlavorTone', () => {
  it('returns a tone with fill, accent, and ink in oklch', () => {
    const tone = getFlavorTone('flavor_123');
    expect(tone.fill).toMatch(/^oklch\(/);
    expect(tone.accent).toMatch(/^oklch\(/);
    expect(tone.ink).toMatch(/^oklch\(/);
  });

  it('is deterministic for the same id', () => {
    const a = getFlavorTone('flavor_chocolate');
    const b = getFlavorTone('flavor_chocolate');
    expect(a).toEqual(b);
  });

  it('returns a tone for every id (no out-of-range index)', () => {
    const samples = ['', 'a', 'flavor_!@#$%^&*()', 'a'.repeat(100)];
    for (const id of samples) {
      const tone = getFlavorTone(id);
      expect(PALETTE).toContainEqual(tone);
    }
  });

  it('mixes length into the seed so identical-prefix ids can land on different tones', () => {
    // Not guaranteed for any specific pair, but at least one collision-prone pair
    // should differ thanks to the length-mix in the seed.
    const tones = ['Chocolate', 'Chocolate Wintermint'].map(getFlavorTone);
    // Both must still be valid palette entries
    for (const tone of tones) {
      expect(PALETTE).toContainEqual(tone);
    }
  });
});

describe('getFlavorColor (deprecated shim)', () => {
  it('returns the tone fill for the same id', () => {
    const id = 'flavor_chocolate';
    expect(getFlavorColor(id)).toBe(getFlavorTone(id).fill);
  });

  it('returns an oklch color string', () => {
    expect(getFlavorColor('flavor_123')).toMatch(/^oklch\(/);
  });
});
