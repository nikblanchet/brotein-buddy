import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { addInventoryOpen } from '../../src/lib/panel-state';

describe('addInventoryOpen store', () => {
  beforeEach(() => {
    addInventoryOpen.set(false);
  });

  it('starts closed', () => {
    expect(get(addInventoryOpen)).toBe(false);
  });

  it('flips open and closed', () => {
    addInventoryOpen.set(true);
    expect(get(addInventoryOpen)).toBe(true);
    addInventoryOpen.set(false);
    expect(get(addInventoryOpen)).toBe(false);
  });
});
