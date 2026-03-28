/**
 * Unit tests for add-inventory utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  buildClosedBoxes,
  buildOpenBox,
  validateAddInventoryInput,
} from '../../../src/lib/utils/add-inventory-utils.js';
import type { Box, Flavor } from '../../../src/types/models.js';

// Test data factories

function createBox(overrides?: Partial<Box>): Box {
  return {
    id: 'box_test',
    flavorId: 'flavor_test',
    quantity: 12,
    location: { stack: 1, height: 1 },
    isOpen: false,
    ...overrides,
  };
}

function createFlavor(overrides?: Partial<Flavor>): Flavor {
  return {
    id: 'flavor_test',
    name: 'Test Flavor',
    randomPool: 'caffeine-free',
    ...overrides,
  };
}

describe('buildClosedBoxes', () => {
  it('returns the requested number of boxes', () => {
    const boxes = buildClosedBoxes('flavor_test', 3, []);
    expect(boxes).toHaveLength(3);
  });

  it('all boxes have quantity 12', () => {
    const boxes = buildClosedBoxes('flavor_test', 2, []);
    boxes.forEach((b) => expect(b.quantity).toBe(12));
  });

  it('all boxes have isOpen=false', () => {
    const boxes = buildClosedBoxes('flavor_test', 2, []);
    boxes.forEach((b) => expect(b.isOpen).toBe(false));
  });

  it('all boxes have the correct flavorId', () => {
    const boxes = buildClosedBoxes('flavor_chocolate', 3, []);
    boxes.forEach((b) => expect(b.flavorId).toBe('flavor_chocolate'));
  });

  it('all boxes have unique IDs', () => {
    const boxes = buildClosedBoxes('flavor_test', 5, []);
    const ids = boxes.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });

  it('IDs follow the box_ prefix format', () => {
    const boxes = buildClosedBoxes('flavor_test', 2, []);
    boxes.forEach((b) => expect(b.id).toMatch(/^box_/));
  });

  it('assigns location { stack: 1, height: 1 } to the first box in empty inventory', () => {
    const boxes = buildClosedBoxes('flavor_test', 1, []);
    expect(boxes[0].location).toEqual({ stack: 1, height: 1 });
  });

  it('assigns sequential non-colliding locations for multiple boxes', () => {
    const boxes = buildClosedBoxes('flavor_test', 3, []);
    const locations = boxes.map((b) => `${b.location.stack},${b.location.height}`);
    const uniqueLocations = new Set(locations);
    expect(uniqueLocations.size).toBe(3);
  });

  it('assigns locations that extend beyond existing inventory', () => {
    const existing = [createBox({ id: 'existing_1', location: { stack: 1, height: 1 } })];
    const boxes = buildClosedBoxes('flavor_test', 1, existing);
    // Should not collide with existing box at stack 1, height 1
    expect(boxes[0].location).not.toEqual({ stack: 1, height: 1 });
  });

  it('sequential boxes do not share location with each other', () => {
    const existing = [
      createBox({ id: 'e1', location: { stack: 1, height: 1 } }),
      createBox({ id: 'e2', location: { stack: 1, height: 2 } }),
    ];
    const boxes = buildClosedBoxes('flavor_test', 3, existing);
    // Each new box should have a unique location, different from others and existing
    const allLocations = [
      ...existing.map((b) => `${b.location.stack},${b.location.height}`),
      ...boxes.map((b) => `${b.location.stack},${b.location.height}`),
    ];
    const unique = new Set(allLocations);
    expect(unique.size).toBe(existing.length + boxes.length);
  });

  it('works with count of 1', () => {
    const boxes = buildClosedBoxes('flavor_test', 1, []);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].quantity).toBe(12);
    expect(boxes[0].isOpen).toBe(false);
  });
});

describe('buildOpenBox', () => {
  it('returns a single box', () => {
    const box = buildOpenBox('flavor_test', 7, []);
    expect(box).toBeDefined();
  });

  it('has isOpen=true', () => {
    const box = buildOpenBox('flavor_test', 7, []);
    expect(box.isOpen).toBe(true);
  });

  it('has the specified quantity', () => {
    const box = buildOpenBox('flavor_test', 7, []);
    expect(box.quantity).toBe(7);
  });

  it('has the correct flavorId', () => {
    const box = buildOpenBox('flavor_chocolate', 3, []);
    expect(box.flavorId).toBe('flavor_chocolate');
  });

  it('has a box_ prefixed ID', () => {
    const box = buildOpenBox('flavor_test', 5, []);
    expect(box.id).toMatch(/^box_/);
  });

  it('assigns location { stack: 1, height: 1 } in empty inventory', () => {
    const box = buildOpenBox('flavor_test', 5, []);
    expect(box.location).toEqual({ stack: 1, height: 1 });
  });

  it('assigns a location that does not collide with existing boxes', () => {
    const existing = [createBox({ id: 'e1', location: { stack: 1, height: 1 } })];
    const box = buildOpenBox('flavor_test', 5, existing);
    expect(box.location).not.toEqual({ stack: 1, height: 1 });
  });

  it('works with quantity 1 (minimum)', () => {
    const box = buildOpenBox('flavor_test', 1, []);
    expect(box.quantity).toBe(1);
  });

  it('works with quantity 12 (maximum)', () => {
    const box = buildOpenBox('flavor_test', 12, []);
    expect(box.quantity).toBe(12);
  });
});

describe('validateAddInventoryInput', () => {
  const flavors = [
    createFlavor({ id: 'flavor_a', name: 'Flavor A' }),
    createFlavor({ id: 'flavor_b', name: 'Flavor B' }),
  ];

  describe('flavorId validation', () => {
    it('returns error when flavorId is empty string', () => {
      const result = validateAddInventoryInput('closed', '', 3, null, flavors);
      expect(result).toBe('Please select a flavor');
    });

    it('returns error when flavorId does not exist in flavors list', () => {
      const result = validateAddInventoryInput('closed', 'flavor_nonexistent', 3, null, flavors);
      expect(result).toBe('Selected flavor does not exist');
    });

    it('accepts a valid flavorId', () => {
      const result = validateAddInventoryInput('closed', 'flavor_a', 3, null, flavors);
      expect(result).toBeNull();
    });
  });

  describe('closed mode validation', () => {
    it('returns error when count is null', () => {
      const result = validateAddInventoryInput('closed', 'flavor_a', null, null, flavors);
      expect(result).toBe('Number of boxes must be at least 1');
    });

    it('returns error when count is 0', () => {
      const result = validateAddInventoryInput('closed', 'flavor_a', 0, null, flavors);
      expect(result).toBe('Number of boxes must be at least 1');
    });

    it('returns error when count is negative', () => {
      const result = validateAddInventoryInput('closed', 'flavor_a', -1, null, flavors);
      expect(result).toBe('Number of boxes must be at least 1');
    });

    it('returns error when count is non-integer', () => {
      const result = validateAddInventoryInput('closed', 'flavor_a', 1.5, null, flavors);
      expect(result).toBe('Number of boxes must be at least 1');
    });

    it('accepts count of 1', () => {
      const result = validateAddInventoryInput('closed', 'flavor_a', 1, null, flavors);
      expect(result).toBeNull();
    });

    it('accepts count of 20', () => {
      const result = validateAddInventoryInput('closed', 'flavor_a', 20, null, flavors);
      expect(result).toBeNull();
    });

    it('does not validate quantity in closed mode', () => {
      // quantity=null should be fine in closed mode
      const result = validateAddInventoryInput('closed', 'flavor_a', 3, null, flavors);
      expect(result).toBeNull();
    });
  });

  describe('open mode validation', () => {
    it('returns error when quantity is null', () => {
      const result = validateAddInventoryInput('open', 'flavor_a', null, null, flavors);
      expect(result).toBe('Quantity must be between 1 and 12');
    });

    it('returns error when quantity is 0', () => {
      const result = validateAddInventoryInput('open', 'flavor_a', null, 0, flavors);
      expect(result).toBe('Quantity must be between 1 and 12');
    });

    it('returns error when quantity is 13', () => {
      const result = validateAddInventoryInput('open', 'flavor_a', null, 13, flavors);
      expect(result).toBe('Quantity must be between 1 and 12');
    });

    it('returns error when quantity is negative', () => {
      const result = validateAddInventoryInput('open', 'flavor_a', null, -1, flavors);
      expect(result).toBe('Quantity must be between 1 and 12');
    });

    it('returns error when quantity is non-integer', () => {
      const result = validateAddInventoryInput('open', 'flavor_a', null, 5.5, flavors);
      expect(result).toBe('Quantity must be between 1 and 12');
    });

    it('accepts quantity of 1 (minimum)', () => {
      const result = validateAddInventoryInput('open', 'flavor_a', null, 1, flavors);
      expect(result).toBeNull();
    });

    it('accepts quantity of 12 (maximum)', () => {
      const result = validateAddInventoryInput('open', 'flavor_a', null, 12, flavors);
      expect(result).toBeNull();
    });

    it('accepts quantity of 7', () => {
      const result = validateAddInventoryInput('open', 'flavor_a', null, 7, flavors);
      expect(result).toBeNull();
    });

    it('does not validate count in open mode', () => {
      // count=null should be fine in open mode
      const result = validateAddInventoryInput('open', 'flavor_a', null, 7, flavors);
      expect(result).toBeNull();
    });
  });

  describe('empty flavors list', () => {
    it('returns error for any flavorId when flavors list is empty', () => {
      const result = validateAddInventoryInput('closed', 'flavor_a', 1, null, []);
      expect(result).toBe('Selected flavor does not exist');
    });
  });
});
