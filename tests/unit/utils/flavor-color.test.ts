/**
 * Unit tests for flavor color generation
 */

import { describe, it, expect } from 'vitest';
import { getFlavorColor } from '../../../src/lib/utils/flavor-color.js';

describe('getFlavorColor', () => {
  it('generates HSL color string', () => {
    const color = getFlavorColor('flavor_123');
    expect(color).toMatch(/^hsl\(\d+, 65%, 55%\)$/);
  });

  it('generates consistent color for same ID', () => {
    const color1 = getFlavorColor('flavor_chocolate');
    const color2 = getFlavorColor('flavor_chocolate');

    expect(color1).toBe(color2);
  });

  it('generates different colors for different IDs', () => {
    const color1 = getFlavorColor('flavor_chocolate');
    const color2 = getFlavorColor('flavor_vanilla');

    expect(color1).not.toBe(color2);
  });

  it('generates colors in valid hue range (0-359)', () => {
    const colors = [
      getFlavorColor('flavor_1'),
      getFlavorColor('flavor_2'),
      getFlavorColor('flavor_3'),
    ];

    colors.forEach((color) => {
      const hueMatch = color.match(/^hsl\((\d+), 65%, 55%\)$/);
      expect(hueMatch).not.toBeNull();
      const hue = parseInt(hueMatch![1], 10);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    });
  });

  it('handles empty string', () => {
    const color = getFlavorColor('');
    expect(color).toMatch(/^hsl\(\d+, 65%, 55%\)$/);
  });

  it('handles special characters', () => {
    const color = getFlavorColor('flavor_!@#$%^&*()');
    expect(color).toMatch(/^hsl\(\d+, 65%, 55%\)$/);
  });
});
