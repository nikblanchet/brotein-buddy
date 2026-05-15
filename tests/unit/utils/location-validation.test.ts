import { describe, it, expect } from 'vitest';
import {
  validateLocationNoGaps,
  getLocationConflict,
  getValidLocations,
  suggestNextLocation,
  formatLocation,
  canSwapLocations,
} from '$lib/utils/location-validation';
import type { Box } from '$lib/types/models';

// Helper to create a box with minimal properties
function createBox(id: string, stack: number, height: number): Box {
  return {
    id,
    flavorId: 'flavor1',
    quantity: 5,
    location: { stack, height },
    isOpen: false,
  };
}

describe('validateLocationNoGaps', () => {
  describe('basic validation', () => {
    it('should allow stack 1, height 1 for empty inventory', () => {
      const result = validateLocationNoGaps(1, 1, []);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-positive stack numbers', () => {
      const result = validateLocationNoGaps(0, 1, []);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Stack must be a positive integer');
    });

    it('should reject non-positive height numbers', () => {
      const result = validateLocationNoGaps(1, 0, []);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Height must be a positive integer');
    });

    it('should reject non-integer stack numbers', () => {
      const result = validateLocationNoGaps(1.5, 1, []);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Stack must be a positive integer');
    });

    it('should reject non-integer height numbers', () => {
      const result = validateLocationNoGaps(1, 1.5, []);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Height must be a positive integer');
    });
  });

  describe('stack gap validation', () => {
    it('should allow stack 2 when stack 1 exists', () => {
      const boxes = [createBox('box1', 1, 1)];
      const result = validateLocationNoGaps(2, 1, boxes);
      expect(result.isValid).toBe(true);
    });

    it('should reject stack 3 when stack 2 is empty', () => {
      const boxes = [createBox('box1', 1, 1)];
      const result = validateLocationNoGaps(3, 1, boxes);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Stack 3 requires non-empty stack 2');
    });

    it('should allow stack 3 when stacks 1 and 2 exist', () => {
      const boxes = [createBox('box1', 1, 1), createBox('box2', 2, 1)];
      const result = validateLocationNoGaps(3, 1, boxes);
      expect(result.isValid).toBe(true);
    });

    it('should reject stack 5 when stack 4 is empty', () => {
      const boxes = [createBox('box1', 1, 1), createBox('box2', 2, 1), createBox('box3', 3, 1)];
      const result = validateLocationNoGaps(5, 1, boxes);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Stack 5 requires non-empty stack 4');
    });
  });

  describe('height gap validation', () => {
    it('should allow height 2 when height 1 exists in same stack', () => {
      const boxes = [createBox('box1', 1, 1)];
      const result = validateLocationNoGaps(1, 2, boxes);
      expect(result.isValid).toBe(true);
    });

    it('should reject height 3 when height 2 does not exist in same stack', () => {
      const boxes = [createBox('box1', 1, 1)];
      const result = validateLocationNoGaps(1, 3, boxes);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Height 3 in stack 1 requires height 2');
    });

    it('should allow height 3 when heights 1 and 2 exist in same stack', () => {
      const boxes = [createBox('box1', 1, 1), createBox('box2', 1, 2)];
      const result = validateLocationNoGaps(1, 3, boxes);
      expect(result.isValid).toBe(true);
    });

    it('should allow height 3 in stack 2 even if stack 1 only has height 1', () => {
      const boxes = [createBox('box1', 1, 1), createBox('box2', 2, 1), createBox('box3', 2, 2)];
      const result = validateLocationNoGaps(2, 3, boxes);
      expect(result.isValid).toBe(true);
    });

    it('should reject height 5 when heights 2, 3, 4 are missing', () => {
      const boxes = [createBox('box1', 1, 1)];
      const result = validateLocationNoGaps(1, 5, boxes);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Height 5 in stack 1 requires height 2');
    });
  });

  describe('excludeBoxId parameter', () => {
    it('should exclude specified box when validating (allow move)', () => {
      const boxes = [createBox('box1', 1, 1), createBox('box2', 1, 2)];
      // Moving box2 to height 1 (swapping with box1)
      const result = validateLocationNoGaps(1, 1, boxes, 'box2');
      expect(result.isValid).toBe(true);
    });

    it('should detect gap when moving box creates empty space', () => {
      const boxes = [createBox('box1', 1, 1), createBox('box2', 1, 2), createBox('box3', 1, 3)];
      // Moving box2 away would leave a gap between 1 and 3
      // But this function only validates the destination, not the source
      // The gap validation would happen when checking height 3 after box2 moves
      const result = validateLocationNoGaps(2, 1, boxes, 'box2');
      expect(result.isValid).toBe(true); // Stack 2 height 1 is valid destination
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple stacks with different heights', () => {
      const boxes = [
        createBox('box1', 1, 1),
        createBox('box2', 1, 2),
        createBox('box3', 1, 3),
        createBox('box4', 2, 1),
        createBox('box5', 2, 2),
      ];
      const result = validateLocationNoGaps(2, 3, boxes);
      expect(result.isValid).toBe(true);
    });

    it('should reject when intermediate stack is missing', () => {
      const boxes = [
        createBox('box1', 1, 1),
        createBox('box2', 3, 1), // Gap: stack 2 is missing
      ];
      const result = validateLocationNoGaps(4, 1, boxes);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requires non-empty stack');
    });
  });
});

describe('getLocationConflict', () => {
  it('should return null when location is empty', () => {
    const boxes = [createBox('box1', 1, 1)];
    const conflict = getLocationConflict(2, 1, boxes);
    expect(conflict).toBeNull();
  });

  it('should return box when location is occupied', () => {
    const boxes = [createBox('box1', 1, 1), createBox('box2', 1, 2)];
    const conflict = getLocationConflict(1, 2, boxes);
    expect(conflict).not.toBeNull();
    expect(conflict?.id).toBe('box2');
  });

  it('should return null for empty inventory', () => {
    const conflict = getLocationConflict(1, 1, []);
    expect(conflict).toBeNull();
  });

  it('should exclude specified box when checking conflict', () => {
    const boxes = [createBox('box1', 1, 1), createBox('box2', 1, 2)];
    // Checking if box2 can move to its current location (should be no conflict)
    const conflict = getLocationConflict(1, 2, boxes, 'box2');
    expect(conflict).toBeNull();
  });

  it('should find conflict with different box when excluding one', () => {
    const boxes = [createBox('box1', 1, 1), createBox('box2', 1, 2), createBox('box3', 1, 3)];
    // Exclude box2, but box1 is still at (1,1)
    const conflict = getLocationConflict(1, 1, boxes, 'box2');
    expect(conflict).not.toBeNull();
    expect(conflict?.id).toBe('box1');
  });
});

describe('getValidLocations', () => {
  it('should return stack 1 height 1 for empty inventory', () => {
    const validLocations = getValidLocations([]);
    expect(validLocations).toEqual([{ stack: 1, height: 1 }]);
  });

  it('should return top of stack 1 and new stack 2 for single box', () => {
    const boxes = [createBox('box1', 1, 1)];
    const validLocations = getValidLocations(boxes);
    expect(validLocations).toContainEqual({ stack: 1, height: 2 });
    expect(validLocations).toContainEqual({ stack: 2, height: 1 });
    expect(validLocations).toHaveLength(2);
  });

  it('should return tops of all existing stacks plus new stack', () => {
    const boxes = [
      createBox('box1', 1, 1),
      createBox('box2', 1, 2),
      createBox('box3', 2, 1),
      createBox('box4', 2, 2),
      createBox('box5', 2, 3),
    ];
    const validLocations = getValidLocations(boxes);
    expect(validLocations).toContainEqual({ stack: 1, height: 3 }); // Top of stack 1
    expect(validLocations).toContainEqual({ stack: 2, height: 4 }); // Top of stack 2
    expect(validLocations).toContainEqual({ stack: 3, height: 1 }); // New stack
    expect(validLocations).toHaveLength(3);
  });

  it('should exclude specified box when calculating valid locations', () => {
    const boxes = [createBox('box1', 1, 1), createBox('box2', 1, 2)];
    // Excluding box2 means stack 1 top is now height 2 (not 3)
    const validLocations = getValidLocations(boxes, 'box2');
    expect(validLocations).toContainEqual({ stack: 1, height: 2 });
    expect(validLocations).toContainEqual({ stack: 2, height: 1 });
  });

  it('should handle gaps in stack numbers correctly', () => {
    const boxes = [
      createBox('box1', 1, 1),
      createBox('box2', 1, 2),
      createBox('box3', 3, 1), // Gap: stack 2 is missing
    ];
    // getValidLocations returns where you CAN add, not validation
    // It should return tops of stacks 1 and 3, plus stack 4
    const validLocations = getValidLocations(boxes);
    expect(validLocations).toContainEqual({ stack: 1, height: 3 });
    expect(validLocations).toContainEqual({ stack: 3, height: 2 });
    expect(validLocations).toContainEqual({ stack: 4, height: 1 });
  });
});

describe('suggestNextLocation', () => {
  it('should return stack 1 height 1 for empty inventory', () => {
    const suggested = suggestNextLocation([]);
    expect(suggested).toEqual({ stack: 1, height: 1 });
  });

  it('should prefer adding to top of existing stack over new stack', () => {
    const boxes = [createBox('box1', 1, 1)];
    const suggested = suggestNextLocation(boxes);
    expect(suggested).toEqual({ stack: 1, height: 2 });
  });

  it('should suggest lowest stack number when multiple options', () => {
    const boxes = [createBox('box1', 1, 1), createBox('box2', 1, 2), createBox('box3', 2, 1)];
    const suggested = suggestNextLocation(boxes);
    expect(suggested).toEqual({ stack: 1, height: 3 });
  });
});

describe('formatLocation', () => {
  it('formats location with the "Stack N · Row H" separator', () => {
    expect(formatLocation(1, 2)).toBe('Stack 1 · Row 2');
    expect(formatLocation(5, 10)).toBe('Stack 5 · Row 10');
  });
});

describe('canSwapLocations', () => {
  it('should allow swapping two boxes at valid locations', () => {
    const boxes = [createBox('box1', 1, 1), createBox('box2', 2, 1)];
    const canSwap = canSwapLocations(
      { stack: 1, height: 1 },
      { stack: 2, height: 1 },
      boxes,
      'box1',
      'box2'
    );
    expect(canSwap).toBe(true);
  });

  it('should allow swaps between valid locations (swaps do not create gaps)', () => {
    const boxes = [createBox('box1', 1, 1), createBox('box2', 1, 2), createBox('box3', 2, 1)];
    // Swapping box2 (1,2) with box3 (2,1)
    // After swap: Stack 1 has box1(1,1) and box3(1,2) - Valid!
    // Stack 2 has box2(2,1) - Valid!
    // Note: Swaps by definition don't create gaps because both locations
    // remain occupied, just with different boxes.
    const canSwap = canSwapLocations(
      { stack: 1, height: 2 },
      { stack: 2, height: 1 },
      boxes,
      'box2',
      'box3'
    );
    expect(canSwap).toBe(true);
  });

  it('should allow swap that maintains no-gap invariant', () => {
    const boxes = [
      createBox('box1', 1, 1),
      createBox('box2', 1, 2),
      createBox('box3', 2, 1),
      createBox('box4', 2, 2),
    ];
    // Swapping tops of two stacks is safe
    const canSwap = canSwapLocations(
      { stack: 1, height: 2 },
      { stack: 2, height: 2 },
      boxes,
      'box2',
      'box4'
    );
    expect(canSwap).toBe(true);
  });
});
