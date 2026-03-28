/**
 * Unit tests for inventory data query utilities
 *
 * Tests data transformations for grouping and querying inventory state.
 */

import { describe, it, expect } from 'vitest';
import {
  groupBoxesByStack,
  getOutOfStockFlavors,
  type BoxWithFlavor,
} from '../../src/lib/inventory-utils.js';
import type { Box, Flavor } from '../../src/types/models.js';

// Test data factories
function createBox(overrides?: Partial<Box>): Box {
  return {
    id: 'box_test',
    flavorId: 'flavor_test',
    quantity: 10,
    location: { stack: 0, height: 0 },
    isOpen: false,
    ...overrides,
  };
}

function createFlavor(overrides?: Partial<Flavor>): Flavor {
  return {
    id: 'flavor_test',
    name: 'Test Flavor',
    excludeFromRandom: false,
    ...overrides,
  };
}

function createBoxWithFlavor(box: Box, flavor: Flavor | null): BoxWithFlavor {
  return { box, flavor };
}

describe('inventory-utils', () => {
  describe('groupBoxesByStack', () => {
    it('groups boxes by stack number', () => {
      const boxes: BoxWithFlavor[] = [
        createBoxWithFlavor(createBox({ id: 'b1', location: { stack: 1, height: 0 } }), null),
        createBoxWithFlavor(createBox({ id: 'b2', location: { stack: 2, height: 0 } }), null),
        createBoxWithFlavor(createBox({ id: 'b3', location: { stack: 1, height: 1 } }), null),
      ];

      const result = groupBoxesByStack(boxes);

      expect(result.size).toBe(2);
      expect(result.get(1)).toHaveLength(2);
      expect(result.get(2)).toHaveLength(1);
    });

    it('sorts boxes within each stack by height (ascending)', () => {
      const boxes: BoxWithFlavor[] = [
        createBoxWithFlavor(
          createBox({ id: 'b1', location: { stack: 1, height: 2 } }),
          createFlavor()
        ),
        createBoxWithFlavor(
          createBox({ id: 'b2', location: { stack: 1, height: 0 } }),
          createFlavor()
        ),
        createBoxWithFlavor(
          createBox({ id: 'b3', location: { stack: 1, height: 1 } }),
          createFlavor()
        ),
      ];

      const result = groupBoxesByStack(boxes);
      const stack1 = result.get(1)!;

      expect(stack1[0].box.id).toBe('b2'); // height 0
      expect(stack1[1].box.id).toBe('b3'); // height 1
      expect(stack1[2].box.id).toBe('b1'); // height 2
    });

    it('sorts stack keys in ascending order', () => {
      const boxes: BoxWithFlavor[] = [
        createBoxWithFlavor(createBox({ id: 'b1', location: { stack: 3, height: 0 } }), null),
        createBoxWithFlavor(createBox({ id: 'b2', location: { stack: 1, height: 0 } }), null),
        createBoxWithFlavor(createBox({ id: 'b3', location: { stack: 2, height: 0 } }), null),
      ];

      const result = groupBoxesByStack(boxes);
      const stackKeys = Array.from(result.keys());

      expect(stackKeys).toEqual([1, 2, 3]);
    });

    it('handles empty array', () => {
      const result = groupBoxesByStack([]);
      expect(result.size).toBe(0);
    });

    it('handles single box', () => {
      const boxes: BoxWithFlavor[] = [
        createBoxWithFlavor(createBox({ id: 'b1', location: { stack: 5, height: 3 } }), null),
      ];

      const result = groupBoxesByStack(boxes);

      expect(result.size).toBe(1);
      expect(result.get(5)).toHaveLength(1);
      expect(result.get(5)![0].box.id).toBe('b1');
    });

    it('preserves flavor information', () => {
      const flavor = createFlavor({ name: 'Chocolate' });
      const boxes: BoxWithFlavor[] = [
        createBoxWithFlavor(createBox({ id: 'b1', location: { stack: 1, height: 0 } }), flavor),
      ];

      const result = groupBoxesByStack(boxes);
      const box = result.get(1)![0];

      expect(box.flavor).toBe(flavor);
      expect(box.flavor?.name).toBe('Chocolate');
    });
  });

  describe('getOutOfStockFlavors', () => {
    it('returns flavors with no boxes', () => {
      const flavors = [
        createFlavor({ id: 'f1', name: 'Chocolate' }),
        createFlavor({ id: 'f2', name: 'Vanilla' }),
      ];
      const boxes = [createBox({ flavorId: 'f1', quantity: 5 })];

      const result = getOutOfStockFlavors(flavors, boxes);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('f2');
      expect(result[0].name).toBe('Vanilla');
    });

    it('returns flavors with only zero-quantity boxes', () => {
      const flavors = [
        createFlavor({ id: 'f1', name: 'Chocolate' }),
        createFlavor({ id: 'f2', name: 'Vanilla' }),
      ];
      const boxes = [
        createBox({ id: 'b1', flavorId: 'f1', quantity: 5 }),
        createBox({ id: 'b2', flavorId: 'f2', quantity: 0 }),
        createBox({ id: 'b3', flavorId: 'f2', quantity: 0 }),
      ];

      const result = getOutOfStockFlavors(flavors, boxes);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('f2');
    });

    it('excludes flavors with any non-zero quantity', () => {
      const flavors = [
        createFlavor({ id: 'f1', name: 'Chocolate' }),
        createFlavor({ id: 'f2', name: 'Vanilla' }),
      ];
      const boxes = [
        createBox({ id: 'b1', flavorId: 'f1', quantity: 0 }),
        createBox({ id: 'b2', flavorId: 'f1', quantity: 1 }), // Has 1 bottle
        createBox({ id: 'b3', flavorId: 'f2', quantity: 0 }),
      ];

      const result = getOutOfStockFlavors(flavors, boxes);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('f2');
    });

    it('returns empty array when all flavors have inventory', () => {
      const flavors = [
        createFlavor({ id: 'f1', name: 'Chocolate' }),
        createFlavor({ id: 'f2', name: 'Vanilla' }),
      ];
      const boxes = [
        createBox({ flavorId: 'f1', quantity: 5 }),
        createBox({ flavorId: 'f2', quantity: 3 }),
      ];

      const result = getOutOfStockFlavors(flavors, boxes);

      expect(result).toHaveLength(0);
    });

    it('handles empty flavors array', () => {
      const result = getOutOfStockFlavors([], []);
      expect(result).toHaveLength(0);
    });

    it('handles empty boxes array', () => {
      const flavors = [
        createFlavor({ id: 'f1', name: 'Chocolate' }),
        createFlavor({ id: 'f2', name: 'Vanilla' }),
      ];

      const result = getOutOfStockFlavors(flavors, []);

      expect(result).toHaveLength(2);
      expect(result).toEqual(flavors);
    });
  });
});
