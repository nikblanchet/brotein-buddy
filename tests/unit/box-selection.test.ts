import { describe, it, expect } from 'vitest';
import { selectPriorityBox } from '../../src/lib/box-selection';
import type { Box } from '../../src/types/models';

describe('selectPriorityBox', () => {
  describe('basic functionality', () => {
    it('returns the box when only one box of the flavor exists', () => {
      const boxes: Box[] = [
        {
          id: 'box1',
          flavorId: 'chocolate',
          quantity: 12,
          location: { stack: 1, height: 0 },
          isOpen: false,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result).toBe(boxes[0]);
      expect(result?.id).toBe('box1');
    });

    it('returns null when no boxes of the flavor exist', () => {
      const boxes: Box[] = [
        {
          id: 'box1',
          flavorId: 'vanilla',
          quantity: 12,
          location: { stack: 1, height: 0 },
          isOpen: false,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result).toBeNull();
    });

    it('returns null for empty array', () => {
      const boxes: Box[] = [];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result).toBeNull();
    });
  });

  describe('priority rule 1: open before unopened', () => {
    it('selects open box over unopened box', () => {
      const boxes: Box[] = [
        {
          id: 'box_unopened',
          flavorId: 'chocolate',
          quantity: 12,
          location: { stack: 1, height: 0 },
          isOpen: false,
        },
        {
          id: 'box_open',
          flavorId: 'chocolate',
          quantity: 8,
          location: { stack: 2, height: 0 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result?.id).toBe('box_open');
      expect(result?.isOpen).toBe(true);
    });

    it('selects open box even when unopened has lower quantity', () => {
      const boxes: Box[] = [
        {
          id: 'box_unopened',
          flavorId: 'chocolate',
          quantity: 3,
          location: { stack: 1, height: 0 },
          isOpen: false,
        },
        {
          id: 'box_open',
          flavorId: 'chocolate',
          quantity: 10,
          location: { stack: 2, height: 0 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result?.id).toBe('box_open');
      expect(result?.isOpen).toBe(true);
    });

    it('selects open box even when unopened is higher on stack', () => {
      const boxes: Box[] = [
        {
          id: 'box_unopened',
          flavorId: 'chocolate',
          quantity: 12,
          location: { stack: 1, height: 5 },
          isOpen: false,
        },
        {
          id: 'box_open',
          flavorId: 'chocolate',
          quantity: 12,
          location: { stack: 2, height: 0 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result?.id).toBe('box_open');
      expect(result?.isOpen).toBe(true);
    });
  });

  describe('priority rule 2: lower quantity before higher', () => {
    it('selects box with lower quantity when both are open', () => {
      const boxes: Box[] = [
        {
          id: 'box_high_qty',
          flavorId: 'chocolate',
          quantity: 10,
          location: { stack: 1, height: 0 },
          isOpen: true,
        },
        {
          id: 'box_low_qty',
          flavorId: 'chocolate',
          quantity: 3,
          location: { stack: 2, height: 0 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result?.id).toBe('box_low_qty');
      expect(result?.quantity).toBe(3);
    });

    it('selects box with lower quantity when both are unopened', () => {
      const boxes: Box[] = [
        {
          id: 'box_high_qty',
          flavorId: 'chocolate',
          quantity: 12,
          location: { stack: 1, height: 0 },
          isOpen: false,
        },
        {
          id: 'box_low_qty',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 2, height: 0 },
          isOpen: false,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result?.id).toBe('box_low_qty');
      expect(result?.quantity).toBe(6);
    });

    it('selects box with quantity 0 over higher quantity', () => {
      const boxes: Box[] = [
        {
          id: 'box_empty',
          flavorId: 'chocolate',
          quantity: 0,
          location: { stack: 1, height: 0 },
          isOpen: true,
        },
        {
          id: 'box_has_qty',
          flavorId: 'chocolate',
          quantity: 5,
          location: { stack: 2, height: 0 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result?.id).toBe('box_empty');
      expect(result?.quantity).toBe(0);
    });

    it('selects lower quantity even when higher quantity is on top of stack', () => {
      const boxes: Box[] = [
        {
          id: 'box_low_qty',
          flavorId: 'chocolate',
          quantity: 3,
          location: { stack: 1, height: 0 },
          isOpen: true,
        },
        {
          id: 'box_high_qty',
          flavorId: 'chocolate',
          quantity: 10,
          location: { stack: 2, height: 5 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result?.id).toBe('box_low_qty');
      expect(result?.quantity).toBe(3);
    });
  });

  describe('priority rule 3: higher stack position before lower', () => {
    it('selects box at higher position when open status and quantity are equal', () => {
      const boxes: Box[] = [
        {
          id: 'box_low',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 1, height: 0 },
          isOpen: true,
        },
        {
          id: 'box_high',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 2, height: 3 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result?.id).toBe('box_high');
      expect(result?.location.height).toBe(3);
    });

    it('selects box at height 1 over height 0', () => {
      const boxes: Box[] = [
        {
          id: 'box_ground',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 1, height: 0 },
          isOpen: true,
        },
        {
          id: 'box_elevated',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 2, height: 1 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result?.id).toBe('box_elevated');
      expect(result?.location.height).toBe(1);
    });

    it('height priority applies to unopened boxes too', () => {
      const boxes: Box[] = [
        {
          id: 'box_low',
          flavorId: 'chocolate',
          quantity: 12,
          location: { stack: 1, height: 0 },
          isOpen: false,
        },
        {
          id: 'box_high',
          flavorId: 'chocolate',
          quantity: 12,
          location: { stack: 2, height: 4 },
          isOpen: false,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result?.id).toBe('box_high');
      expect(result?.location.height).toBe(4);
    });
  });

  describe('combined priority rules', () => {
    it('applies all three rules in correct order', () => {
      const boxes: Box[] = [
        {
          id: 'box1',
          flavorId: 'chocolate',
          quantity: 12,
          location: { stack: 1, height: 5 },
          isOpen: false,
        },
        {
          id: 'box2',
          flavorId: 'chocolate',
          quantity: 8,
          location: { stack: 2, height: 0 },
          isOpen: true,
        },
        {
          id: 'box3',
          flavorId: 'chocolate',
          quantity: 3,
          location: { stack: 3, height: 2 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      // Should select box3: open (rule 1), lowest quantity (rule 2)
      expect(result?.id).toBe('box3');
    });

    it('uses height as tiebreaker when open status and quantity are equal', () => {
      const boxes: Box[] = [
        {
          id: 'box1',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 1, height: 1 },
          isOpen: true,
        },
        {
          id: 'box2',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 2, height: 3 },
          isOpen: true,
        },
        {
          id: 'box3',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 3, height: 0 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      // Should select box2: all open, same quantity, highest position
      expect(result?.id).toBe('box2');
      expect(result?.location.height).toBe(3);
    });

    it('handles complex scenario with multiple flavors', () => {
      const boxes: Box[] = [
        {
          id: 'vanilla1',
          flavorId: 'vanilla',
          quantity: 1,
          location: { stack: 1, height: 10 },
          isOpen: true,
        },
        {
          id: 'chocolate1',
          flavorId: 'chocolate',
          quantity: 12,
          location: { stack: 2, height: 0 },
          isOpen: false,
        },
        {
          id: 'chocolate2',
          flavorId: 'chocolate',
          quantity: 5,
          location: { stack: 3, height: 1 },
          isOpen: true,
        },
        {
          id: 'vanilla2',
          flavorId: 'vanilla',
          quantity: 8,
          location: { stack: 4, height: 0 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      // Should only consider chocolate boxes, select chocolate2 (open, lower quantity)
      expect(result?.id).toBe('chocolate2');
      expect(result?.flavorId).toBe('chocolate');
    });
  });

  describe('edge cases', () => {
    it('handles single box that matches', () => {
      const boxes: Box[] = [
        {
          id: 'only_box',
          flavorId: 'chocolate',
          quantity: 7,
          location: { stack: 1, height: 0 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result?.id).toBe('only_box');
    });

    it('ignores boxes of different flavors', () => {
      const boxes: Box[] = [
        {
          id: 'vanilla_box',
          flavorId: 'vanilla',
          quantity: 1,
          location: { stack: 1, height: 10 },
          isOpen: true,
        },
        {
          id: 'strawberry_box',
          flavorId: 'strawberry',
          quantity: 2,
          location: { stack: 2, height: 5 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result).toBeNull();
    });

    it('handles all boxes being identical except ID', () => {
      const boxes: Box[] = [
        {
          id: 'box1',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 1, height: 2 },
          isOpen: true,
        },
        {
          id: 'box2',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 2, height: 2 },
          isOpen: true,
        },
        {
          id: 'box3',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 3, height: 2 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      // Should return the first one in the array (stable sort)
      expect(result?.id).toBe('box1');
    });

    it('handles large number of boxes efficiently', () => {
      const boxes: Box[] = Array.from({ length: 100 }, (_, i) => ({
        id: `box${i}`,
        flavorId: i % 3 === 0 ? 'chocolate' : 'vanilla',
        quantity: i % 12,
        location: { stack: i % 5, height: i % 10 },
        isOpen: i % 2 === 0,
      }));

      const result = selectPriorityBox(boxes, 'chocolate');

      expect(result).not.toBeNull();
      expect(result?.flavorId).toBe('chocolate');
      expect(result?.isOpen).toBe(true); // Should prioritize open boxes
    });
  });

  describe('stack number independence', () => {
    it('ignores stack number in priority (only height matters)', () => {
      const boxes: Box[] = [
        {
          id: 'box_stack1',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 1, height: 2 },
          isOpen: true,
        },
        {
          id: 'box_stack5',
          flavorId: 'chocolate',
          quantity: 6,
          location: { stack: 5, height: 2 },
          isOpen: true,
        },
      ];

      const result = selectPriorityBox(boxes, 'chocolate');

      // Stack number doesn't matter, both have same priority
      // Should return first in array (stable sort)
      expect(result?.id).toBe('box_stack1');
    });
  });
});
