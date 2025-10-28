/**
 * Unit tests for NumberPad component
 *
 * Tests the helper functions for generating number ranges and validation.
 * We test the logic rather than rendering due to @testing-library/svelte
 * compatibility issues with Svelte 5.
 *
 * @see https://github.com/testing-library/svelte-testing-library/issues/296
 */

import { describe, it, expect } from 'vitest';
import {
  generateNumberRange,
  isInRange,
  calculateRows,
} from '../../../src/lib/components/numberpad-utils.js';

describe('NumberPad', () => {
  describe('generateNumberRange', () => {
    it('generates range from 1 to 12 by default', () => {
      const result = generateNumberRange(1, 12);
      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('generates range from 0 to 5', () => {
      const result = generateNumberRange(0, 5);
      expect(result).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('generates single number range', () => {
      const result = generateNumberRange(5, 5);
      expect(result).toEqual([5]);
    });

    it('generates range with negative numbers', () => {
      const result = generateNumberRange(-3, 2);
      expect(result).toEqual([-3, -2, -1, 0, 1, 2]);
    });

    it('returns empty array when min > max', () => {
      const result = generateNumberRange(10, 1);
      expect(result).toEqual([]);
    });

    it('generates large range', () => {
      const result = generateNumberRange(1, 100);
      expect(result).toHaveLength(100);
      expect(result[0]).toBe(1);
      expect(result[99]).toBe(100);
    });

    it('includes both min and max in the range', () => {
      const result = generateNumberRange(5, 10);
      expect(result[0]).toBe(5);
      expect(result[result.length - 1]).toBe(10);
    });
  });

  describe('isInRange', () => {
    it('returns true for value within range', () => {
      expect(isInRange(5, 1, 12)).toBe(true);
    });

    it('returns true for value at min boundary', () => {
      expect(isInRange(1, 1, 12)).toBe(true);
    });

    it('returns true for value at max boundary', () => {
      expect(isInRange(12, 1, 12)).toBe(true);
    });

    it('returns false for value below min', () => {
      expect(isInRange(0, 1, 12)).toBe(false);
    });

    it('returns false for value above max', () => {
      expect(isInRange(13, 1, 12)).toBe(false);
    });

    it('handles negative range', () => {
      expect(isInRange(-5, -10, -1)).toBe(true);
      expect(isInRange(0, -10, -1)).toBe(false);
    });

    it('handles single value range', () => {
      expect(isInRange(5, 5, 5)).toBe(true);
      expect(isInRange(4, 5, 5)).toBe(false);
      expect(isInRange(6, 5, 5)).toBe(false);
    });
  });

  describe('calculateRows', () => {
    it('calculates rows for 12 items in 3 columns', () => {
      expect(calculateRows(12, 3)).toBe(4);
    });

    it('calculates rows for 10 items in 3 columns (partial last row)', () => {
      expect(calculateRows(10, 3)).toBe(4);
    });

    it('calculates rows for 9 items in 3 columns (exact fit)', () => {
      expect(calculateRows(9, 3)).toBe(3);
    });

    it('calculates rows for 1 item in 3 columns', () => {
      expect(calculateRows(1, 3)).toBe(1);
    });

    it('calculates rows for 0 items', () => {
      expect(calculateRows(0, 3)).toBe(0);
    });

    it('handles different column counts', () => {
      expect(calculateRows(12, 4)).toBe(3); // 12 items in 4 columns = 3 rows
      expect(calculateRows(12, 2)).toBe(6); // 12 items in 2 columns = 6 rows
      expect(calculateRows(12, 1)).toBe(12); // 12 items in 1 column = 12 rows
    });

    it('rounds up for partial rows', () => {
      expect(calculateRows(13, 3)).toBe(5); // 13 items in 3 columns = 4 full + 1 partial
      expect(calculateRows(14, 3)).toBe(5);
      expect(calculateRows(15, 3)).toBe(5);
    });
  });

  describe('integration scenarios', () => {
    it('generates default number pad range (1-12)', () => {
      const numbers = generateNumberRange(1, 12);
      expect(numbers).toHaveLength(12);
      expect(calculateRows(numbers.length, 3)).toBe(4);
    });

    it('validates all numbers in generated range are in bounds', () => {
      const min = 1;
      const max = 12;
      const numbers = generateNumberRange(min, max);

      numbers.forEach((num) => {
        expect(isInRange(num, min, max)).toBe(true);
      });
    });

    it('generates custom range and validates it', () => {
      const min = 5;
      const max = 15;
      const numbers = generateNumberRange(min, max);

      expect(numbers).toHaveLength(11);
      expect(isInRange(min - 1, min, max)).toBe(false);
      expect(isInRange(min, min, max)).toBe(true);
      expect(isInRange(max, min, max)).toBe(true);
      expect(isInRange(max + 1, min, max)).toBe(false);
    });

    it('calculates grid layout for default range', () => {
      const numbers = generateNumberRange(1, 12);
      const rows = calculateRows(numbers.length, 3);
      const totalCells = rows * 3;

      expect(totalCells).toBeGreaterThanOrEqual(numbers.length);
      expect(totalCells).toBeLessThan(numbers.length + 3); // No more than 1 partial row
    });
  });
});
