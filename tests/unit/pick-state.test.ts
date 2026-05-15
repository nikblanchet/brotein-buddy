import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { pickResult, clearPickResult } from '../../src/lib/pick-state';

describe('pickResult store', () => {
  beforeEach(() => {
    pickResult.set(null);
  });

  it('starts null', () => {
    expect(get(pickResult)).toBeNull();
  });

  it('accepts a snapshot of the most recent pick', () => {
    pickResult.set({
      boxId: 'box-1',
      flavorId: 'flavor-1',
      method: 'random',
      pool: 'caffeinated',
    });
    expect(get(pickResult)).toEqual({
      boxId: 'box-1',
      flavorId: 'flavor-1',
      method: 'random',
      pool: 'caffeinated',
    });
  });

  it('clearPickResult resets the store to null', () => {
    pickResult.set({
      boxId: 'box-2',
      flavorId: 'flavor-2',
      method: 'favorite',
      pool: null,
    });
    clearPickResult();
    expect(get(pickResult)).toBeNull();
  });
});
