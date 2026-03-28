/**
 * Unit tests for flavor utility functions
 *
 * @group unit
 * @module tests/unit/utils/flavor
 */

import { describe, it, expect } from 'vitest';
import { maybeGetFlavor } from '../../../src/lib/utils/flavor';
import type { Flavor } from '../../../src/types/models';

describe('maybeGetFlavor', () => {
  /**
   * Test data: A set of sample flavors for testing
   */
  const testFlavors: Flavor[] = [
    { id: 'flavor_chocolate', name: 'Chocolate', randomPool: 'caffeine-free' },
    { id: 'flavor_vanilla', name: 'Vanilla', randomPool: 'caffeine-free' },
    { id: 'flavor_strawberry', name: 'Strawberry', randomPool: null },
    { id: 'flavor_banana', name: 'Banana', randomPool: 'caffeine-free' },
  ];

  describe('valid inputs', () => {
    it('returns flavor when ID exists in array', () => {
      const result = maybeGetFlavor('flavor_chocolate', testFlavors);
      expect(result).toEqual(testFlavors[0]);
      expect(result?.name).toBe('Chocolate');
    });

    it('returns correct flavor from multiple options', () => {
      const result = maybeGetFlavor('flavor_strawberry', testFlavors);
      expect(result).toEqual(testFlavors[2]);
      expect(result?.name).toBe('Strawberry');
      expect(result?.randomPool).toBeNull();
    });

    it('returns the first matching flavor if duplicates exist', () => {
      const duplicateFlavors: Flavor[] = [
        { id: 'dup', name: 'First', randomPool: 'caffeine-free' },
        { id: 'dup', name: 'Second', randomPool: 'caffeine-free' },
      ];
      const result = maybeGetFlavor('dup', duplicateFlavors);
      expect(result?.name).toBe('First');
    });
  });

  describe('null or undefined inputs', () => {
    it('returns null when flavorId is null', () => {
      const result = maybeGetFlavor(null, testFlavors);
      expect(result).toBeNull();
    });

    it('returns null when flavorId is undefined', () => {
      const result = maybeGetFlavor(undefined, testFlavors);
      expect(result).toBeNull();
    });

    it('returns null when flavors array is null', () => {
      const result = maybeGetFlavor('flavor_chocolate', null as unknown as Flavor[]);
      expect(result).toBeNull();
    });

    it('returns null when flavors array is undefined', () => {
      const result = maybeGetFlavor('flavor_chocolate', undefined as unknown as Flavor[]);
      expect(result).toBeNull();
    });

    it('returns null when both inputs are null', () => {
      const result = maybeGetFlavor(null, null as unknown as Flavor[]);
      expect(result).toBeNull();
    });
  });

  describe('flavor not found', () => {
    it('returns null when ID does not exist in array', () => {
      const result = maybeGetFlavor('flavor_nonexistent', testFlavors);
      expect(result).toBeNull();
    });

    it('returns null when ID is empty string', () => {
      const result = maybeGetFlavor('', testFlavors);
      expect(result).toBeNull();
    });

    it('returns null when searching empty array', () => {
      const result = maybeGetFlavor('flavor_chocolate', []);
      expect(result).toBeNull();
    });

    it('is case sensitive for flavor IDs', () => {
      const result = maybeGetFlavor('FLAVOR_CHOCOLATE', testFlavors);
      expect(result).toBeNull();
    });

    it('does not match partial IDs', () => {
      const result = maybeGetFlavor('flavor_choc', testFlavors);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles array with single flavor', () => {
      const singleFlavor: Flavor[] = [
        { id: 'only', name: 'Only Flavor', randomPool: 'caffeine-free' },
      ];
      const result = maybeGetFlavor('only', singleFlavor);
      expect(result).toEqual(singleFlavor[0]);
    });

    it('handles flavors with special characters in ID', () => {
      const specialFlavors: Flavor[] = [
        { id: 'flavor-with-dash', name: 'Dashed', randomPool: 'caffeine-free' },
        { id: 'flavor_with_underscore', name: 'Underscored', randomPool: 'caffeine-free' },
        { id: 'flavor.with.dot', name: 'Dotted', randomPool: 'caffeine-free' },
      ];

      expect(maybeGetFlavor('flavor-with-dash', specialFlavors)?.name).toBe('Dashed');
      expect(maybeGetFlavor('flavor_with_underscore', specialFlavors)?.name).toBe('Underscored');
      expect(maybeGetFlavor('flavor.with.dot', specialFlavors)?.name).toBe('Dotted');
    });

    it('handles flavors with Unicode characters in name', () => {
      const unicodeFlavors: Flavor[] = [
        { id: 'emoji', name: '🍫 Chocolate', randomPool: 'caffeine-free' },
        { id: 'accents', name: 'Café', randomPool: 'caffeine-free' },
      ];

      const result = maybeGetFlavor('emoji', unicodeFlavors);
      expect(result?.name).toBe('🍫 Chocolate');
    });

    it('does not mutate input array', () => {
      const originalFlavors = [...testFlavors];
      maybeGetFlavor('flavor_chocolate', testFlavors);
      expect(testFlavors).toEqual(originalFlavors);
    });

    it('returns same reference as array element (not a copy)', () => {
      const result = maybeGetFlavor('flavor_chocolate', testFlavors);
      expect(result).toBe(testFlavors[0]);
    });
  });

  describe('type safety', () => {
    it('returns properly typed Flavor object', () => {
      const result = maybeGetFlavor('flavor_chocolate', testFlavors);
      if (result) {
        // These should all be type-safe without errors
        const id: string = result.id;
        const name: string = result.name;
        const pool: string | null = result.randomPool;

        expect(id).toBeDefined();
        expect(name).toBeDefined();
        expect(typeof pool === 'string' || pool === null).toBe(true);
      }
    });

    it('returns null type when not found', () => {
      const result = maybeGetFlavor('nonexistent', testFlavors);
      // Type should be Flavor | null
      expect(result).toBeNull();
    });
  });
});
