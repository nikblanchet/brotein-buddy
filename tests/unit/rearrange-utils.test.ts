import { describe, it, expect } from 'vitest';
import {
  simulateMove,
  reorderBoxesAfterMove,
  getAffectedBoxes,
  validateRearrangementState,
} from '$lib/rearrange-utils';
import type { Box, Location } from '$lib/types/models';

// Helper to create test boxes
function createBox(
  id: string,
  flavorId: string,
  stack: number,
  height: number,
  quantity = 12
): Box {
  return {
    id,
    flavorId,
    quantity,
    location: { stack, height },
    isOpen: false,
  };
}

describe('rearrange-utils', () => {
  describe('simulateMove', () => {
    it('should update box location without mutating original', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1), createBox('box-2', 'vanilla', 1, 2)];

      const newLocation: Location = { stack: 2, height: 1 };
      const updated = simulateMove(boxes, 'box-1', newLocation);

      // Original unchanged
      expect(boxes[0].location).toEqual({ stack: 1, height: 1 });

      // Updated array has new location
      expect(updated[0].location).toEqual(newLocation);
      expect(updated[1]).toEqual(boxes[1]);
    });

    it('should create new location object (deep copy)', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1)];
      const newLocation: Location = { stack: 2, height: 3 };
      const result = simulateMove(boxes, 'box-1', newLocation);

      // Mutating newLocation should not affect result
      newLocation.stack = 999;
      expect(result[0].location.stack).toBe(2);
    });

    it('should handle moving to same location', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1)];
      const result = simulateMove(boxes, 'box-1', { stack: 1, height: 1 });

      expect(result[0].location).toEqual({ stack: 1, height: 1 });
    });

    it('should handle non-existent box ID gracefully', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1)];
      const result = simulateMove(boxes, 'non-existent', { stack: 2, height: 1 });

      // Original box unchanged
      expect(result[0].location).toEqual({ stack: 1, height: 1 });
    });

    it('should preserve all box properties except location', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1, 5)];
      boxes[0].isOpen = true;

      const result = simulateMove(boxes, 'box-1', { stack: 2, height: 1 });

      expect(result[0].id).toBe('box-1');
      expect(result[0].flavorId).toBe('chocolate');
      expect(result[0].quantity).toBe(5);
      expect(result[0].isOpen).toBe(true);
    });

    it('should handle empty array', () => {
      const result = simulateMove([], 'box-1', { stack: 1, height: 1 });
      expect(result).toEqual([]);
    });

    it('should handle moving box in middle of array', () => {
      const boxes = [
        createBox('box-1', 'chocolate', 1, 1),
        createBox('box-2', 'vanilla', 2, 1),
        createBox('box-3', 'strawberry', 3, 1),
      ];

      const result = simulateMove(boxes, 'box-2', { stack: 4, height: 1 });

      expect(result[0].location).toEqual({ stack: 1, height: 1 }); // unchanged
      expect(result[1].location).toEqual({ stack: 4, height: 1 }); // moved
      expect(result[2].location).toEqual({ stack: 3, height: 1 }); // unchanged
    });
  });

  describe('reorderBoxesAfterMove', () => {
    it('should reorder boxes after a move', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1), createBox('box-2', 'vanilla', 2, 1)];

      const result = reorderBoxesAfterMove(boxes, 'box-1', { stack: 3, height: 1 });

      expect(result[0].location).toEqual({ stack: 3, height: 1 });
      expect(result[1].location).toEqual({ stack: 2, height: 1 });
    });

    it('should handle moving first box', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1), createBox('box-2', 'vanilla', 2, 1)];

      const result = reorderBoxesAfterMove(boxes, 'box-1', { stack: 2, height: 2 });

      expect(result[0].location).toEqual({ stack: 2, height: 2 });
    });

    it('should handle moving last box', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1), createBox('box-2', 'vanilla', 2, 1)];

      const result = reorderBoxesAfterMove(boxes, 'box-2', { stack: 1, height: 2 });

      expect(result[1].location).toEqual({ stack: 1, height: 2 });
    });

    it('should handle moving to new stack', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1), createBox('box-2', 'vanilla', 1, 2)];

      const result = reorderBoxesAfterMove(boxes, 'box-1', { stack: 5, height: 1 });

      expect(result[0].location.stack).toBe(5);
      expect(result[0].location.height).toBe(1);
    });

    it('should handle moving to different height', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1), createBox('box-2', 'vanilla', 1, 2)];

      const result = reorderBoxesAfterMove(boxes, 'box-2', { stack: 1, height: 3 });

      expect(result[1].location.height).toBe(3);
    });

    it('should not mutate original array', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1)];
      const originalLocation = { ...boxes[0].location };

      reorderBoxesAfterMove(boxes, 'box-1', { stack: 2, height: 1 });

      expect(boxes[0].location).toEqual(originalLocation);
    });
  });

  describe('getAffectedBoxes', () => {
    it('should return only the moved box for simple moves', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1), createBox('box-2', 'vanilla', 2, 1)];

      const affected = getAffectedBoxes(boxes, 'box-1', { stack: 3, height: 1 });

      expect(affected).toEqual(['box-1']);
    });

    it('should handle empty boxes array', () => {
      const affected = getAffectedBoxes([], 'box-1', { stack: 1, height: 1 });

      expect(affected).toEqual(['box-1']);
    });

    it('should return same box ID for multiple calls', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1)];

      const affected1 = getAffectedBoxes(boxes, 'box-1', { stack: 2, height: 1 });
      const affected2 = getAffectedBoxes(boxes, 'box-1', { stack: 3, height: 1 });

      expect(affected1).toEqual(['box-1']);
      expect(affected2).toEqual(['box-1']);
    });

    it('should work with different box IDs', () => {
      const boxes = [
        createBox('box-1', 'chocolate', 1, 1),
        createBox('box-2', 'vanilla', 2, 1),
        createBox('box-3', 'strawberry', 3, 1),
      ];

      expect(getAffectedBoxes(boxes, 'box-1', { stack: 4, height: 1 })).toEqual(['box-1']);
      expect(getAffectedBoxes(boxes, 'box-2', { stack: 4, height: 1 })).toEqual(['box-2']);
      expect(getAffectedBoxes(boxes, 'box-3', { stack: 4, height: 1 })).toEqual(['box-3']);
    });
  });

  describe('validateRearrangementState', () => {
    it('should validate valid state', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1), createBox('box-2', 'vanilla', 1, 2)];

      const result = validateRearrangementState(boxes);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect floating boxes (height gap)', () => {
      const boxes = [
        createBox('box-1', 'chocolate', 1, 1),
        createBox('box-2', 'vanilla', 1, 3), // Gap at height 2
      ];

      const result = validateRearrangementState(boxes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('box-2');
    });

    it('should detect floating stacks (stack gap)', () => {
      const boxes = [
        createBox('box-1', 'chocolate', 1, 1),
        createBox('box-2', 'vanilla', 3, 1), // Gap at stack 2
      ];

      const result = validateRearrangementState(boxes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('box-2');
    });

    it('should handle empty state', () => {
      const result = validateRearrangementState([]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect multiple errors', () => {
      const boxes = [
        createBox('box-1', 'chocolate', 1, 1),
        createBox('box-2', 'vanilla', 1, 3), // Height gap
        createBox('box-3', 'strawberry', 3, 1), // Stack gap
      ];

      const result = validateRearrangementState(boxes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate single box', () => {
      const boxes = [createBox('box-1', 'chocolate', 1, 1)];

      const result = validateRearrangementState(boxes);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate multiple stacks without gaps', () => {
      const boxes = [
        createBox('box-1', 'chocolate', 1, 1),
        createBox('box-2', 'vanilla', 1, 2),
        createBox('box-3', 'strawberry', 2, 1),
        createBox('box-4', 'banana', 2, 2),
      ];

      const result = validateRearrangementState(boxes);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect gap when first height is not 1', () => {
      const boxes = [
        createBox('box-1', 'chocolate', 1, 2), // Should start at height 1
      ];

      const result = validateRearrangementState(boxes);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('box-1');
    });

    it('should detect gap when first stack is not 1', () => {
      const boxes = [
        createBox('box-1', 'chocolate', 2, 1), // Should start at stack 1
      ];

      const result = validateRearrangementState(boxes);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('box-1');
    });

    it('should validate complex valid arrangement', () => {
      const boxes = [
        createBox('box-1', 'chocolate', 1, 1),
        createBox('box-2', 'vanilla', 1, 2),
        createBox('box-3', 'strawberry', 1, 3),
        createBox('box-4', 'banana', 2, 1),
        createBox('box-5', 'mint', 2, 2),
        createBox('box-6', 'caramel', 3, 1),
      ];

      const result = validateRearrangementState(boxes);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should include box ID in error messages', () => {
      const boxes = [
        createBox('box-alpha', 'chocolate', 1, 1),
        createBox('box-beta', 'vanilla', 1, 3), // Gap
      ];

      const result = validateRearrangementState(boxes);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('box-beta');
    });
  });
});
