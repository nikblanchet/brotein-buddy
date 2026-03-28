/**
 * Unit tests for inventory sorting utilities
 */

import { describe, it, expect } from 'vitest';
import { sortBoxes } from '../../../src/lib/utils/inventory-sort.js';
import type { BoxWithFlavor } from '../../../src/lib/inventory-utils.js';
import type { Box, Flavor } from '../../../src/types/models.js';

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

describe('sortBoxes', () => {
  describe('flavor sorting', () => {
    it('sorts by flavor name alphabetically ascending', () => {
      const boxes: BoxWithFlavor[] = [
        createBoxWithFlavor(createBox({ id: 'b1' }), createFlavor({ id: 'f1', name: 'Vanilla' })),
        createBoxWithFlavor(createBox({ id: 'b2' }), createFlavor({ id: 'f2', name: 'Chocolate' })),
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
        createBoxWithFlavor(createBox({ id: 'b1' }), createFlavor({ id: 'f1', name: 'Chocolate' })),
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
