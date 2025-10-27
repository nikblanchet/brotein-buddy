/**
 * Unit tests for random flavor selection algorithm.
 *
 * @group unit
 */

import { describe, it, expect } from 'vitest';
import { selectRandomFlavor } from '../../src/lib/random-selection';
import type { AppState, Flavor, Box } from '../../src/types/models';

describe('selectRandomFlavor', () => {
  // Test helpers for creating test data
  const createFlavor = (id: string, name: string, excludeFromRandom = false): Flavor => ({
    id,
    name,
    excludeFromRandom,
  });

  const createBox = (id: string, flavorId: string, quantity: number, isOpen = false): Box => ({
    id,
    flavorId,
    quantity,
    location: { stack: 0, height: 0 },
    isOpen,
  });

  const createState = (
    flavors: Flavor[],
    boxes: Box[],
    favoriteFlavorId: string | null = null
  ): AppState => ({
    version: 1,
    flavors,
    boxes,
    favoriteFlavorId,
    settings: {},
  });

  describe('basic functionality', () => {
    it('should return null when there are no flavors', () => {
      const state = createState([], []);
      const result = selectRandomFlavor(state);
      expect(result).toBeNull();
    });

    it('should return null when there are no boxes', () => {
      const state = createState([createFlavor('f1', 'Chocolate')], []);
      const result = selectRandomFlavor(state);
      expect(result).toBeNull();
    });

    it('should return null when all flavors are excluded', () => {
      const state = createState(
        [createFlavor('f1', 'Chocolate', true)],
        [createBox('b1', 'f1', 12)]
      );
      const result = selectRandomFlavor(state);
      expect(result).toBeNull();
    });

    it('should return null when all boxes have zero quantity', () => {
      const state = createState([createFlavor('f1', 'Chocolate')], [createBox('b1', 'f1', 0)]);
      const result = selectRandomFlavor(state);
      expect(result).toBeNull();
    });

    it('should return the only available flavor', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const state = createState([chocolate], [createBox('b1', 'f1', 12)]);
      const result = selectRandomFlavor(state);
      expect(result).toEqual(chocolate);
    });

    it('should return a valid flavor from multiple options', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const vanilla = createFlavor('f2', 'Vanilla');
      const state = createState(
        [chocolate, vanilla],
        [createBox('b1', 'f1', 10), createBox('b2', 'f2', 10)]
      );
      const result = selectRandomFlavor(state);
      expect(result).not.toBeNull();
      expect([chocolate, vanilla]).toContainEqual(result);
    });
  });

  describe('excludeFromRandom flag', () => {
    it('should not select flavors marked with excludeFromRandom', () => {
      const chocolate = createFlavor('f1', 'Chocolate', false);
      const vanilla = createFlavor('f2', 'Vanilla', true); // excluded
      const state = createState(
        [chocolate, vanilla],
        [createBox('b1', 'f1', 10), createBox('b2', 'f2', 10)]
      );

      // Run multiple times to ensure vanilla is never selected
      for (let i = 0; i < 50; i++) {
        const result = selectRandomFlavor(state);
        expect(result).toEqual(chocolate);
        expect(result).not.toEqual(vanilla);
      }
    });

    it('should only select non-excluded flavors from mixed set', () => {
      const chocolate = createFlavor('f1', 'Chocolate', false);
      const vanilla = createFlavor('f2', 'Vanilla', true); // excluded
      const strawberry = createFlavor('f3', 'Strawberry', false);
      const state = createState(
        [chocolate, vanilla, strawberry],
        [createBox('b1', 'f1', 10), createBox('b2', 'f2', 10), createBox('b3', 'f3', 10)]
      );

      // Run multiple times to ensure vanilla is never selected
      for (let i = 0; i < 50; i++) {
        const result = selectRandomFlavor(state);
        expect(result).not.toBeNull();
        expect([chocolate, strawberry]).toContainEqual(result);
        expect(result).not.toEqual(vanilla);
      }
    });
  });

  describe('excludeLastPick parameter', () => {
    it('should not select the flavor specified in excludeLastPick', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const vanilla = createFlavor('f2', 'Vanilla');
      const state = createState(
        [chocolate, vanilla],
        [createBox('b1', 'f1', 10), createBox('b2', 'f2', 10)]
      );

      // Exclude chocolate
      for (let i = 0; i < 50; i++) {
        const result = selectRandomFlavor(state, 'f1');
        expect(result).toEqual(vanilla);
      }
    });

    it('should return null if only flavor is excluded by excludeLastPick', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const state = createState([chocolate], [createBox('b1', 'f1', 12)]);
      const result = selectRandomFlavor(state, 'f1');
      expect(result).toBeNull();
    });

    it('should work when excludeLastPick is undefined', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const state = createState([chocolate], [createBox('b1', 'f1', 12)]);
      const result = selectRandomFlavor(state, undefined);
      expect(result).toEqual(chocolate);
    });

    it('should work when excludeLastPick does not match any flavor', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const state = createState([chocolate], [createBox('b1', 'f1', 12)]);
      const result = selectRandomFlavor(state, 'nonexistent');
      expect(result).toEqual(chocolate);
    });
  });

  describe('quantity-based weighting', () => {
    it('should sum quantities across multiple boxes of same flavor', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const state = createState(
        [chocolate],
        [createBox('b1', 'f1', 8), createBox('b2', 'f1', 12), createBox('b3', 'f1', 4)]
      );
      // Total quantity is 24, so chocolate should always be selected
      const result = selectRandomFlavor(state);
      expect(result).toEqual(chocolate);
    });

    it('should not select flavors with total quantity of zero', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const vanilla = createFlavor('f2', 'Vanilla');
      const state = createState(
        [chocolate, vanilla],
        [createBox('b1', 'f1', 10), createBox('b2', 'f2', 0), createBox('b3', 'f2', 0)]
      );

      for (let i = 0; i < 50; i++) {
        const result = selectRandomFlavor(state);
        expect(result).toEqual(chocolate);
      }
    });

    it('should handle flavors with no boxes', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const vanilla = createFlavor('f2', 'Vanilla'); // no boxes
      const state = createState([chocolate, vanilla], [createBox('b1', 'f1', 10)]);

      for (let i = 0; i < 50; i++) {
        const result = selectRandomFlavor(state);
        expect(result).toEqual(chocolate);
      }
    });
  });

  describe('combined filters', () => {
    it('should apply both excludeFromRandom and excludeLastPick', () => {
      const chocolate = createFlavor('f1', 'Chocolate', false);
      const vanilla = createFlavor('f2', 'Vanilla', true); // excluded by flag
      const strawberry = createFlavor('f3', 'Strawberry', false);
      const state = createState(
        [chocolate, vanilla, strawberry],
        [createBox('b1', 'f1', 10), createBox('b2', 'f2', 10), createBox('b3', 'f3', 10)]
      );

      // Exclude chocolate by last pick, vanilla by flag
      // Only strawberry should be selected
      for (let i = 0; i < 50; i++) {
        const result = selectRandomFlavor(state, 'f1');
        expect(result).toEqual(strawberry);
      }
    });

    it('should apply all three filters: excludeFromRandom, excludeLastPick, and zero quantity', () => {
      const chocolate = createFlavor('f1', 'Chocolate', false);
      const vanilla = createFlavor('f2', 'Vanilla', true); // excluded by flag
      const strawberry = createFlavor('f3', 'Strawberry', false);
      const banana = createFlavor('f4', 'Banana', false);
      const state = createState(
        [chocolate, vanilla, strawberry, banana],
        [
          createBox('b1', 'f1', 10), // will be excluded by excludeLastPick
          createBox('b2', 'f2', 10), // excluded by flag
          createBox('b3', 'f3', 0), // excluded by zero quantity
          createBox('b4', 'f4', 10), // only valid option
        ]
      );

      for (let i = 0; i < 50; i++) {
        const result = selectRandomFlavor(state, 'f1');
        expect(result).toEqual(banana);
      }
    });
  });

  describe('statistical distribution', () => {
    it('should select flavors proportional to their total quantity', () => {
      // Chocolate: 60 quantity (60% of 100)
      // Vanilla: 30 quantity (30% of 100)
      // Strawberry: 10 quantity (10% of 100)
      const chocolate = createFlavor('f1', 'Chocolate');
      const vanilla = createFlavor('f2', 'Vanilla');
      const strawberry = createFlavor('f3', 'Strawberry');

      const state = createState(
        [chocolate, vanilla, strawberry],
        [createBox('b1', 'f1', 60), createBox('b2', 'f2', 30), createBox('b3', 'f3', 10)]
      );

      // Run 1000 selections and count results
      const counts = { f1: 0, f2: 0, f3: 0 };
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const result = selectRandomFlavor(state);
        expect(result).not.toBeNull();
        counts[result!.id as keyof typeof counts]++;
      }

      // Check that percentages are roughly correct (within 10% tolerance)
      const chocolatePercent = counts.f1 / iterations;
      const vanillaPercent = counts.f2 / iterations;
      const strawberryPercent = counts.f3 / iterations;

      // Chocolate should be ~60% (allow 50-70%)
      expect(chocolatePercent).toBeGreaterThan(0.5);
      expect(chocolatePercent).toBeLessThan(0.7);

      // Vanilla should be ~30% (allow 20-40%)
      expect(vanillaPercent).toBeGreaterThan(0.2);
      expect(vanillaPercent).toBeLessThan(0.4);

      // Strawberry should be ~10% (allow 5-15%)
      expect(strawberryPercent).toBeGreaterThan(0.05);
      expect(strawberryPercent).toBeLessThan(0.15);

      // Total should be 100%
      expect(chocolatePercent + vanillaPercent + strawberryPercent).toBeCloseTo(1.0, 1);
    });

    it('should handle equal weights correctly', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const vanilla = createFlavor('f2', 'Vanilla');

      const state = createState(
        [chocolate, vanilla],
        [createBox('b1', 'f1', 50), createBox('b2', 'f2', 50)]
      );

      // Run 1000 selections
      const counts = { f1: 0, f2: 0 };
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const result = selectRandomFlavor(state);
        expect(result).not.toBeNull();
        counts[result!.id as keyof typeof counts]++;
      }

      // Each should be roughly 50% (allow 40-60%)
      const chocolatePercent = counts.f1 / iterations;
      const vanillaPercent = counts.f2 / iterations;

      expect(chocolatePercent).toBeGreaterThan(0.4);
      expect(chocolatePercent).toBeLessThan(0.6);
      expect(vanillaPercent).toBeGreaterThan(0.4);
      expect(vanillaPercent).toBeLessThan(0.6);
    });

    it('should handle quantities summed across multiple boxes', () => {
      // Chocolate: 8 + 12 = 20 (66.7% of 30)
      // Vanilla: 5 + 5 = 10 (33.3% of 30)
      const chocolate = createFlavor('f1', 'Chocolate');
      const vanilla = createFlavor('f2', 'Vanilla');

      const state = createState(
        [chocolate, vanilla],
        [
          createBox('b1', 'f1', 8),
          createBox('b2', 'f1', 12),
          createBox('b3', 'f2', 5),
          createBox('b4', 'f2', 5),
        ]
      );

      // Run 1000 selections
      const counts = { f1: 0, f2: 0 };
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const result = selectRandomFlavor(state);
        expect(result).not.toBeNull();
        counts[result!.id as keyof typeof counts]++;
      }

      // Chocolate should be ~67% (allow 57-77%)
      const chocolatePercent = counts.f1 / iterations;
      expect(chocolatePercent).toBeGreaterThan(0.57);
      expect(chocolatePercent).toBeLessThan(0.77);

      // Vanilla should be ~33% (allow 23-43%)
      const vanillaPercent = counts.f2 / iterations;
      expect(vanillaPercent).toBeGreaterThan(0.23);
      expect(vanillaPercent).toBeLessThan(0.43);
    });
  });

  describe('edge cases', () => {
    it('should handle single box with quantity 1', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const state = createState([chocolate], [createBox('b1', 'f1', 1)]);
      const result = selectRandomFlavor(state);
      expect(result).toEqual(chocolate);
    });

    it('should handle very large quantities', () => {
      const chocolate = createFlavor('f1', 'Chocolate');
      const state = createState([chocolate], [createBox('b1', 'f1', 999999)]);
      const result = selectRandomFlavor(state);
      expect(result).toEqual(chocolate);
    });

    it('should handle many boxes of different flavors', () => {
      const flavors = Array.from({ length: 10 }, (_, i) => createFlavor(`f${i}`, `Flavor ${i}`));
      const boxes = Array.from({ length: 30 }, (_, i) => createBox(`b${i}`, `f${i % 10}`, 10));
      const state = createState(flavors, boxes);

      const result = selectRandomFlavor(state);
      expect(result).not.toBeNull();
      expect(flavors).toContainEqual(result);
    });

    it('should return last flavor when floating point precision causes walk-through to complete', () => {
      // This tests the fallback in the weighted selection algorithm
      const chocolate = createFlavor('f1', 'Chocolate');
      const vanilla = createFlavor('f2', 'Vanilla');
      const state = createState(
        [chocolate, vanilla],
        [createBox('b1', 'f1', 1), createBox('b2', 'f2', 1)]
      );

      // Run many times to potentially trigger floating point edge case
      for (let i = 0; i < 100; i++) {
        const result = selectRandomFlavor(state);
        expect(result).not.toBeNull();
        expect([chocolate, vanilla]).toContainEqual(result);
      }
    });
  });
});
