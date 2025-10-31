/**
 * Unit tests for inventory utility functions
 *
 * Tests data transformations and calculations for the Inventory component.
 */

import { describe, it, expect } from 'vitest';
import {
  groupBoxesByStack,
  getOutOfStockFlavors,
  sortBoxes,
  getFlavorColor,
  formatLocation,
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

  describe('sortBoxes', () => {
    describe('flavor sorting', () => {
      it('sorts by flavor name alphabetically ascending', () => {
        const boxes: BoxWithFlavor[] = [
          createBoxWithFlavor(createBox({ id: 'b1' }), createFlavor({ id: 'f1', name: 'Vanilla' })),
          createBoxWithFlavor(
            createBox({ id: 'b2' }),
            createFlavor({ id: 'f2', name: 'Chocolate' })
          ),
          createBoxWithFlavor(
            createBox({ id: 'b3' }),
            createFlavor({ id: 'f3', name: 'Strawberry' })
          ),
        ];

        const result = sortBoxes(boxes, 'flavor', 'asc');

        expect(result[0].flavor?.name).toBe('Chocolate');
        expect(result[1].flavor?.name).toBe('Strawberry');
        expect(result[2].flavor?.name).toBe('Vanilla');
      });

      it('sorts by flavor name alphabetically descending', () => {
        const boxes: BoxWithFlavor[] = [
          createBoxWithFlavor(
            createBox({ id: 'b1' }),
            createFlavor({ id: 'f1', name: 'Chocolate' })
          ),
          createBoxWithFlavor(createBox({ id: 'b2' }), createFlavor({ id: 'f2', name: 'Vanilla' })),
        ];

        const result = sortBoxes(boxes, 'flavor', 'desc');

        expect(result[0].flavor?.name).toBe('Vanilla');
        expect(result[1].flavor?.name).toBe('Chocolate');
      });

      it('treats null flavors as "Unknown" for sorting', () => {
        const boxes: BoxWithFlavor[] = [
          createBoxWithFlavor(createBox({ id: 'b1' }), createFlavor({ name: 'Vanilla' })),
          createBoxWithFlavor(createBox({ id: 'b2' }), null), // No flavor
          createBoxWithFlavor(createBox({ id: 'b3' }), createFlavor({ name: 'Chocolate' })),
        ];

        const result = sortBoxes(boxes, 'flavor', 'asc');

        // "Chocolate", "Unknown", "Vanilla"
        expect(result[0].flavor?.name).toBe('Chocolate');
        expect(result[1].flavor).toBeNull();
        expect(result[2].flavor?.name).toBe('Vanilla');
      });
    });

    describe('quantity sorting', () => {
      it('sorts by quantity ascending', () => {
        const boxes: BoxWithFlavor[] = [
          createBoxWithFlavor(createBox({ id: 'b1', quantity: 10 }), null),
          createBoxWithFlavor(createBox({ id: 'b2', quantity: 5 }), null),
          createBoxWithFlavor(createBox({ id: 'b3', quantity: 15 }), null),
        ];

        const result = sortBoxes(boxes, 'quantity', 'asc');

        expect(result[0].box.quantity).toBe(5);
        expect(result[1].box.quantity).toBe(10);
        expect(result[2].box.quantity).toBe(15);
      });

      it('sorts by quantity descending', () => {
        const boxes: BoxWithFlavor[] = [
          createBoxWithFlavor(createBox({ id: 'b1', quantity: 10 }), null),
          createBoxWithFlavor(createBox({ id: 'b2', quantity: 5 }), null),
          createBoxWithFlavor(createBox({ id: 'b3', quantity: 15 }), null),
        ];

        const result = sortBoxes(boxes, 'quantity', 'desc');

        expect(result[0].box.quantity).toBe(15);
        expect(result[1].box.quantity).toBe(10);
        expect(result[2].box.quantity).toBe(5);
      });

      it('handles zero quantities', () => {
        const boxes: BoxWithFlavor[] = [
          createBoxWithFlavor(createBox({ id: 'b1', quantity: 0 }), null),
          createBoxWithFlavor(createBox({ id: 'b2', quantity: 5 }), null),
        ];

        const result = sortBoxes(boxes, 'quantity', 'asc');

        expect(result[0].box.quantity).toBe(0);
        expect(result[1].box.quantity).toBe(5);
      });
    });

    describe('location sorting', () => {
      it('sorts by stack first, then height ascending', () => {
        const boxes: BoxWithFlavor[] = [
          createBoxWithFlavor(createBox({ id: 'b1', location: { stack: 2, height: 0 } }), null),
          createBoxWithFlavor(createBox({ id: 'b2', location: { stack: 1, height: 1 } }), null),
          createBoxWithFlavor(createBox({ id: 'b3', location: { stack: 1, height: 0 } }), null),
          createBoxWithFlavor(createBox({ id: 'b4', location: { stack: 2, height: 1 } }), null),
        ];

        const result = sortBoxes(boxes, 'location', 'asc');

        expect(result[0].box.id).toBe('b3'); // stack 1, height 0
        expect(result[1].box.id).toBe('b2'); // stack 1, height 1
        expect(result[2].box.id).toBe('b1'); // stack 2, height 0
        expect(result[3].box.id).toBe('b4'); // stack 2, height 1
      });

      it('sorts by location descending', () => {
        const boxes: BoxWithFlavor[] = [
          createBoxWithFlavor(createBox({ id: 'b1', location: { stack: 1, height: 0 } }), null),
          createBoxWithFlavor(createBox({ id: 'b2', location: { stack: 2, height: 1 } }), null),
        ];

        const result = sortBoxes(boxes, 'location', 'desc');

        expect(result[0].box.location).toEqual({ stack: 2, height: 1 });
        expect(result[1].box.location).toEqual({ stack: 1, height: 0 });
      });
    });

    it('does not mutate the original array', () => {
      const boxes: BoxWithFlavor[] = [
        createBoxWithFlavor(createBox({ id: 'b1', quantity: 10 }), null),
        createBoxWithFlavor(createBox({ id: 'b2', quantity: 5 }), null),
      ];

      const originalOrder = boxes.map((b) => b.box.id);
      sortBoxes(boxes, 'quantity', 'asc');

      expect(boxes.map((b) => b.box.id)).toEqual(originalOrder);
    });

    it('handles empty array', () => {
      const result = sortBoxes([], 'flavor', 'asc');
      expect(result).toHaveLength(0);
    });
  });

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

  describe('formatLocation', () => {
    it('formats location with stack and height', () => {
      const result = formatLocation(1, 2);
      expect(result).toBe('Stack 1, Height 2');
    });

    it('handles zero values', () => {
      const result = formatLocation(0, 0);
      expect(result).toBe('Stack 0, Height 0');
    });

    it('handles large numbers', () => {
      const result = formatLocation(999, 888);
      expect(result).toBe('Stack 999, Height 888');
    });
  });
});
