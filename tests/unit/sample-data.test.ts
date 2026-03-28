/**
 * Unit tests for sample data generator.
 *
 * @module tests/unit/sample-data
 */

import { describe, it, expect } from 'vitest';
import { generateSampleData } from '../../src/lib/sample-data';
import { isAppState, isFlavor, isBox } from '../../src/types/models';

describe('generateSampleData', () => {
  it('should generate valid AppState', () => {
    const data = generateSampleData();
    expect(isAppState(data)).toBe(true);
  });

  it('should have correct schema version', () => {
    const data = generateSampleData();
    expect(data.version).toBe(2);
  });

  describe('flavors', () => {
    it('should generate multiple flavors', () => {
      const data = generateSampleData();
      expect(data.flavors.length).toBeGreaterThan(0);
    });

    it('should have all valid flavors', () => {
      const data = generateSampleData();
      data.flavors.forEach((flavor) => {
        expect(isFlavor(flavor)).toBe(true);
      });
    });

    it('should have unique flavor IDs', () => {
      const data = generateSampleData();
      const ids = data.flavors.map((f) => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have at least one flavor available for random selection', () => {
      const data = generateSampleData();
      const availableForRandom = data.flavors.filter((f) => f.randomPool !== null);
      expect(availableForRandom.length).toBeGreaterThan(0);
    });

    it('should include popular flavor names', () => {
      const data = generateSampleData();
      const names = data.flavors.map((f) => f.name.toLowerCase());

      // Check for at least some common flavors
      const hasChocolate = names.some((n) => n.includes('chocolate'));
      const hasVanilla = names.some((n) => n.includes('vanilla'));

      expect(hasChocolate || hasVanilla).toBe(true);
    });
  });

  describe('boxes', () => {
    it('should generate multiple boxes', () => {
      const data = generateSampleData();
      expect(data.boxes.length).toBeGreaterThan(0);
    });

    it('should have all valid boxes', () => {
      const data = generateSampleData();
      data.boxes.forEach((box) => {
        expect(isBox(box)).toBe(true);
      });
    });

    it('should have unique box IDs', () => {
      const data = generateSampleData();
      const ids = data.boxes.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should reference valid flavor IDs', () => {
      const data = generateSampleData();
      const flavorIds = new Set(data.flavors.map((f) => f.id));

      data.boxes.forEach((box) => {
        expect(flavorIds.has(box.flavorId)).toBe(true);
      });
    });

    it('should have boxes with non-negative quantities', () => {
      const data = generateSampleData();
      data.boxes.forEach((box) => {
        expect(box.quantity).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have boxes with valid locations', () => {
      const data = generateSampleData();
      data.boxes.forEach((box) => {
        expect(box.location.stack).toBeGreaterThanOrEqual(0);
        expect(box.location.height).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(box.location.stack)).toBe(true);
        expect(Number.isInteger(box.location.height)).toBe(true);
      });
    });

    it('should include both open and closed boxes', () => {
      const data = generateSampleData();
      const openBoxes = data.boxes.filter((b) => b.isOpen);
      const closedBoxes = data.boxes.filter((b) => !b.isOpen);

      // Should have at least one of each for demo purposes
      expect(openBoxes.length).toBeGreaterThan(0);
      expect(closedBoxes.length).toBeGreaterThan(0);
    });

    it('should demonstrate multiple stacks', () => {
      const data = generateSampleData();
      const stackNumbers = new Set(data.boxes.map((b) => b.location.stack));

      // Should have boxes in multiple stacks to show visual grid
      expect(stackNumbers.size).toBeGreaterThan(1);
    });

    it('should demonstrate stacked boxes (height > 0)', () => {
      const data = generateSampleData();
      const elevatedBoxes = data.boxes.filter((b) => b.location.height > 0);

      // Should have at least one box stacked on another
      expect(elevatedBoxes.length).toBeGreaterThan(0);
    });

    it('should include boxes with varying quantities', () => {
      const data = generateSampleData();
      const quantities = data.boxes.map((b) => b.quantity);
      const uniqueQuantities = new Set(quantities);

      // Should have different quantities to show variation
      expect(uniqueQuantities.size).toBeGreaterThan(1);
    });
  });

  describe('favorite flavor', () => {
    it('should have a favorite flavor configured', () => {
      const data = generateSampleData();
      expect(data.favoriteFlavorId).not.toBeNull();
    });

    it('should reference a valid flavor ID if set', () => {
      const data = generateSampleData();
      if (data.favoriteFlavorId) {
        const flavorIds = data.flavors.map((f) => f.id);
        expect(flavorIds).toContain(data.favoriteFlavorId);
      }
    });
  });

  describe('settings', () => {
    it('should have settings object', () => {
      const data = generateSampleData();
      expect(data.settings).toBeDefined();
      expect(typeof data.settings).toBe('object');
    });
  });

  describe('demo features', () => {
    it('should demonstrate priority selection with same-flavor boxes', () => {
      const data = generateSampleData();

      // Find flavors with multiple boxes
      const flavorBoxCounts = new Map<string, number>();
      data.boxes.forEach((box) => {
        const count = flavorBoxCounts.get(box.flavorId) || 0;
        flavorBoxCounts.set(box.flavorId, count + 1);
      });

      const flavorsWithMultipleBoxes = Array.from(flavorBoxCounts.entries()).filter(
        ([, count]) => count > 1
      );

      // Should have at least one flavor with multiple boxes to demonstrate priority
      expect(flavorsWithMultipleBoxes.length).toBeGreaterThan(0);
    });

    it('should demonstrate weighted random selection with varying quantities', () => {
      const data = generateSampleData();

      // Calculate total quantity per flavor
      const flavorQuantities = new Map<string, number>();
      data.boxes.forEach((box) => {
        const total = flavorQuantities.get(box.flavorId) || 0;
        flavorQuantities.set(box.flavorId, total + box.quantity);
      });

      const quantities = Array.from(flavorQuantities.values()).filter((q) => q > 0);

      // Should have different total quantities to demonstrate weighting
      expect(Math.max(...quantities) - Math.min(...quantities)).toBeGreaterThan(0);
    });

    it('should include at least one flavor excluded from random', () => {
      const data = generateSampleData();
      const excludedFlavors = data.flavors.filter((f) => f.randomPool === null);

      // Should demonstrate the exclusion feature
      expect(excludedFlavors.length).toBeGreaterThan(0);
    });
  });

  describe('consistency', () => {
    it('should generate the same data structure on multiple calls', () => {
      const data1 = generateSampleData();
      const data2 = generateSampleData();

      // Structure should be consistent (same flavors, same box count)
      expect(data1.flavors.length).toBe(data2.flavors.length);
      expect(data1.boxes.length).toBe(data2.boxes.length);
      expect(data1.favoriteFlavorId).toBe(data2.favoriteFlavorId);
    });

    it('should have deterministic flavor IDs', () => {
      const data1 = generateSampleData();
      const data2 = generateSampleData();

      const ids1 = data1.flavors.map((f) => f.id).sort();
      const ids2 = data2.flavors.map((f) => f.id).sort();

      expect(ids1).toEqual(ids2);
    });
  });
});
