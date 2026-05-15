/**
 * Pure helpers backing the visual LocationPicker.
 *
 * Splits the picker's render data away from the Svelte component so the
 * stack-walking logic is straightforwardly testable. The component is a
 * thin shell over `buildPickerStacks` and `getEmptySlots`; if the
 * helpers are right, the visual layout follows.
 *
 * @module lib/utils/location-picker
 */

import type { Box, Flavor, Location } from '../../types/models';

/**
 * One stack as the picker presents it: the existing boxes already
 * placed there (top of stack first), plus the next height that is
 * available for placement.
 */
export type StackColumn = {
  /** 1-indexed stack number */
  readonly stack: number;
  /**
   * Boxes that are already in this stack, paired with their flavor for
   * rendering initials and tones. Sorted by height descending so the
   * picker can lay them out top-to-bottom in DOM order with no extra
   * sorting at render time.
   */
  readonly existing: ReadonlyArray<{ box: Box; flavor: Flavor | null }>;
  /**
   * The next height that's free for placement (one above the current
   * top of the stack). 1 for an empty stack.
   */
  readonly nextHeight: number;
};

/**
 * Picker render data: each existing stack column plus a trailing NEW
 * stack at one beyond the highest occupied stack number.
 */
export type PickerStacks = {
  readonly stacks: ReadonlyArray<StackColumn>;
  readonly newStackNumber: number;
};

/**
 * Build the per-stack render data the picker needs.
 *
 * Walks every existing box once to gather the stack columns and their
 * top heights, then pairs each box with its flavor so the picker can
 * render initials and tones without re-resolving on every keystroke.
 *
 * @param boxes - Existing inventory
 * @param flavors - All known flavors (for cell tones / initials)
 * @returns Picker stacks plus the next-available new-stack number
 *
 * @example
 * ```ts
 * const { stacks, newStackNumber } = buildPickerStacks(state.boxes, state.flavors);
 * // stacks[0] = { stack: 1, existing: [...top-down...], nextHeight: 4 }
 * // newStackNumber = 7  // one past the highest existing stack
 * ```
 */
export function buildPickerStacks(
  boxes: ReadonlyArray<Box>,
  flavors: ReadonlyArray<Flavor>
): PickerStacks {
  const flavorMap = new Map<string, Flavor>();
  for (const flavor of flavors) {
    flavorMap.set(flavor.id, flavor);
  }

  const byStack = new Map<number, Box[]>();
  let maxStack = 0;
  for (const box of boxes) {
    const stack = box.location.stack;
    maxStack = Math.max(maxStack, stack);
    const existing = byStack.get(stack);
    if (existing) {
      existing.push(box);
    } else {
      byStack.set(stack, [box]);
    }
  }

  const stacks: StackColumn[] = [];
  for (let stack = 1; stack <= maxStack; stack++) {
    const stackBoxes = byStack.get(stack) ?? [];
    // Top-down render order: highest height first.
    const sorted = [...stackBoxes].sort((a, b) => b.location.height - a.location.height);
    const topHeight = sorted.length === 0 ? 0 : sorted[0].location.height;
    stacks.push({
      stack,
      existing: sorted.map((box) => ({ box, flavor: flavorMap.get(box.flavorId) ?? null })),
      nextHeight: topHeight + 1,
    });
  }

  return { stacks, newStackNumber: maxStack + 1 };
}

/**
 * Return every empty slot the picker would expose as tappable.
 *
 * Mirrors `buildPickerStacks` but flattens the result down to the
 * Location values themselves - useful when downstream code needs to
 * answer "is this location available?" without rebuilding the picker
 * structure.
 *
 * @param boxes - Existing inventory
 * @returns One Location per available slot (top of each existing stack
 *          plus one new-stack slot at the trailing position)
 */
export function getEmptySlots(boxes: ReadonlyArray<Box>): ReadonlyArray<Location> {
  let maxStack = 0;
  const topByStack = new Map<number, number>();
  for (const box of boxes) {
    const stack = box.location.stack;
    maxStack = Math.max(maxStack, stack);
    const currentTop = topByStack.get(stack) ?? 0;
    if (box.location.height > currentTop) {
      topByStack.set(stack, box.location.height);
    }
  }

  const slots: Location[] = [];
  for (let stack = 1; stack <= maxStack; stack++) {
    const top = topByStack.get(stack) ?? 0;
    slots.push({ stack, height: top + 1 });
  }
  // Trailing new stack always available - first ever box lands here too,
  // since maxStack === 0 makes this slot { stack: 1, height: 1 }.
  slots.push({ stack: maxStack + 1, height: 1 });
  return slots;
}
