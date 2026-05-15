/**
 * Unit tests for LocationPicker pure helpers.
 */

import { describe, it, expect } from 'vitest';
import { buildPickerStacks, getEmptySlots } from '../../../src/lib/utils/location-picker.js';
import type { Box, Flavor } from '../../../src/types/models.js';

function makeBox(id: string, flavorId: string, stack: number, height: number): Box {
  return {
    id,
    flavorId,
    quantity: 12,
    location: { stack, height },
    isOpen: false,
  };
}

const FLAVORS: Flavor[] = [
  { id: 'f1', name: 'Chocolate', randomPool: 'caffeine-free' },
  { id: 'f2', name: 'Vanilla', randomPool: 'caffeinated' },
];

describe('buildPickerStacks', () => {
  it('returns no stacks and a NEW slot at 1 for empty inventory', () => {
    const result = buildPickerStacks([], FLAVORS);
    expect(result.stacks).toEqual([]);
    expect(result.newStackNumber).toBe(1);
  });

  it('builds one stack per occupied position, sorted top-down', () => {
    const boxes = [makeBox('a', 'f1', 1, 1), makeBox('b', 'f1', 1, 2), makeBox('c', 'f2', 2, 1)];
    const result = buildPickerStacks(boxes, FLAVORS);
    expect(result.stacks).toHaveLength(2);

    const stack1 = result.stacks[0];
    expect(stack1.stack).toBe(1);
    expect(stack1.existing.map((e) => e.box.id)).toEqual(['b', 'a']); // height-descending
    expect(stack1.nextHeight).toBe(3);
    expect(stack1.existing[0].flavor?.name).toBe('Chocolate');

    const stack2 = result.stacks[1];
    expect(stack2.stack).toBe(2);
    expect(stack2.existing.map((e) => e.box.id)).toEqual(['c']);
    expect(stack2.nextHeight).toBe(2);

    expect(result.newStackNumber).toBe(3);
  });

  it('renders empty intermediate stacks (no boxes) when later stacks exist', () => {
    const boxes = [makeBox('a', 'f1', 3, 1)];
    const result = buildPickerStacks(boxes, FLAVORS);
    expect(result.stacks).toHaveLength(3);
    expect(result.stacks[0]).toEqual({
      stack: 1,
      existing: [],
      nextHeight: 1,
    });
    expect(result.stacks[1]).toEqual({
      stack: 2,
      existing: [],
      nextHeight: 1,
    });
    expect(result.stacks[2].stack).toBe(3);
    expect(result.stacks[2].nextHeight).toBe(2);
    expect(result.newStackNumber).toBe(4);
  });

  it('attaches null flavor when the box references an unknown flavor id', () => {
    const boxes = [makeBox('a', 'mystery', 1, 1)];
    const result = buildPickerStacks(boxes, FLAVORS);
    expect(result.stacks[0].existing[0].flavor).toBeNull();
  });
});

describe('getEmptySlots', () => {
  it('returns just the NEW slot at stack 1 for empty inventory', () => {
    expect(getEmptySlots([])).toEqual([{ stack: 1, height: 1 }]);
  });

  it('returns the next height per existing stack plus the trailing NEW slot', () => {
    const boxes = [makeBox('a', 'f1', 1, 1), makeBox('b', 'f1', 1, 2), makeBox('c', 'f2', 2, 1)];
    const slots = getEmptySlots(boxes);
    expect(slots).toEqual([
      { stack: 1, height: 3 }, // above the top of stack 1
      { stack: 2, height: 2 }, // above the top of stack 2
      { stack: 3, height: 1 }, // NEW stack
    ]);
  });

  it('treats unobserved intermediate stacks as empty (next slot at height 1)', () => {
    const boxes = [makeBox('a', 'f1', 3, 1)];
    expect(getEmptySlots(boxes)).toEqual([
      { stack: 1, height: 1 },
      { stack: 2, height: 1 },
      { stack: 3, height: 2 },
      { stack: 4, height: 1 },
    ]);
  });
});
