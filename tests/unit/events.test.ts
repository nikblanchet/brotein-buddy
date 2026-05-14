/**
 * Unit tests for the event timeline data model + factory.
 *
 * Covers `isAppEvent` (all six variants, positive + negative cases) and
 * `createEvent` (id format, timestamp shape, payload pass-through).
 */

import { describe, it, expect } from 'vitest';
import { createEvent } from '../../src/lib/events';
import { isAppEvent } from '../../src/types/events';

describe('createEvent', () => {
  it('produces an id with the `ev_` prefix', () => {
    const ev = createEvent('box_opened', { boxId: 'b1', flavorId: 'f1' });
    expect(ev.id).toMatch(/^ev_/);
  });

  it('produces an ISO 8601 timestamp', () => {
    const ev = createEvent('box_opened', { boxId: 'b1', flavorId: 'f1' });
    expect(ev.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(ev.timestamp).toISOString()).toBe(ev.timestamp);
  });

  it('sets the type discriminator from the first arg', () => {
    const ev = createEvent('selection_cancelled', {
      flavorId: 'f1',
      method: 'manual',
      pool: null,
    });
    expect(ev.type).toBe('selection_cancelled');
  });

  it('passes through box_received payload fields verbatim', () => {
    const ev = createEvent('box_received', {
      boxId: 'b1',
      flavorId: 'f1',
      quantity: 12,
      location: { stack: 2, height: 1 },
      isOpen: false,
    });
    expect(ev.boxId).toBe('b1');
    expect(ev.flavorId).toBe('f1');
    expect(ev.quantity).toBe(12);
    expect(ev.location).toEqual({ stack: 2, height: 1 });
    expect(ev.isOpen).toBe(false);
  });

  it('passes through shake_taken payload fields verbatim', () => {
    const ev = createEvent('shake_taken', {
      boxId: 'b1',
      flavorId: 'f1',
      method: 'random',
      pool: 'caffeinated',
    });
    expect(ev.method).toBe('random');
    expect(ev.pool).toBe('caffeinated');
  });

  it('passes through selection_cancelled with null flavorId', () => {
    const ev = createEvent('selection_cancelled', {
      flavorId: null,
      method: 'random',
      pool: 'caffeine-free',
    });
    expect(ev.flavorId).toBeNull();
  });

  it('generates unique ids across calls', () => {
    const a = createEvent('box_opened', { boxId: 'b1', flavorId: 'f1' });
    const b = createEvent('box_opened', { boxId: 'b1', flavorId: 'f1' });
    expect(a.id).not.toBe(b.id);
  });

  it('produces events that pass isAppEvent', () => {
    expect(
      isAppEvent(
        createEvent('box_received', {
          boxId: 'b1',
          flavorId: 'f1',
          quantity: 1,
          location: { stack: 0, height: 0 },
          isOpen: false,
        })
      )
    ).toBe(true);
    expect(isAppEvent(createEvent('box_opened', { boxId: 'b1', flavorId: 'f1' }))).toBe(true);
    expect(
      isAppEvent(createEvent('box_removed', { boxId: 'b1', flavorId: 'f1', finalQuantity: 0 }))
    ).toBe(true);
    expect(
      isAppEvent(
        createEvent('shake_taken', {
          boxId: 'b1',
          flavorId: 'f1',
          method: 'random',
          pool: 'caffeinated',
        })
      )
    ).toBe(true);
    expect(
      isAppEvent(
        createEvent('shake_rejected', {
          rejectedFlavorId: 'f1',
          method: 'random',
          pool: 'caffeine-free',
        })
      )
    ).toBe(true);
    expect(
      isAppEvent(
        createEvent('selection_cancelled', {
          flavorId: null,
          method: 'favorite',
          pool: null,
        })
      )
    ).toBe(true);
  });
});

describe('isAppEvent — positive cases', () => {
  it('accepts a valid box_received event', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'box_received',
        boxId: 'b1',
        flavorId: 'f1',
        quantity: 12,
        location: { stack: 0, height: 0 },
        isOpen: false,
      })
    ).toBe(true);
  });

  it('accepts a valid box_opened event', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'box_opened',
        boxId: 'b1',
        flavorId: 'f1',
      })
    ).toBe(true);
  });

  it('accepts a valid box_removed event', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'box_removed',
        boxId: 'b1',
        flavorId: 'f1',
        finalQuantity: 3,
      })
    ).toBe(true);
  });

  it('accepts a valid shake_taken event for the random path', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'shake_taken',
        boxId: 'b1',
        flavorId: 'f1',
        method: 'random',
        pool: 'caffeinated',
      })
    ).toBe(true);
  });

  it('accepts a valid shake_taken event for the favorite path with null pool', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'shake_taken',
        boxId: 'b1',
        flavorId: 'f1',
        method: 'favorite',
        pool: null,
      })
    ).toBe(true);
  });

  it('accepts a valid shake_rejected event', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'shake_rejected',
        rejectedFlavorId: 'f1',
        method: 'random',
        pool: 'caffeine-free',
      })
    ).toBe(true);
  });

  it('accepts a valid selection_cancelled event with null flavorId', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'selection_cancelled',
        flavorId: null,
        method: 'random',
        pool: 'caffeinated',
      })
    ).toBe(true);
  });
});

describe('isAppEvent — negative cases', () => {
  it('rejects null', () => {
    expect(isAppEvent(null)).toBe(false);
  });

  it('rejects non-object', () => {
    expect(isAppEvent('hello')).toBe(false);
    expect(isAppEvent(42)).toBe(false);
  });

  it('rejects missing id', () => {
    expect(
      isAppEvent({
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'box_opened',
        boxId: 'b1',
        flavorId: 'f1',
      })
    ).toBe(false);
  });

  it('rejects empty id', () => {
    expect(
      isAppEvent({
        id: '',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'box_opened',
        boxId: 'b1',
        flavorId: 'f1',
      })
    ).toBe(false);
  });

  it('rejects missing timestamp', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        type: 'box_opened',
        boxId: 'b1',
        flavorId: 'f1',
      })
    ).toBe(false);
  });

  it('rejects unknown type', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'something_else',
        boxId: 'b1',
      })
    ).toBe(false);
  });

  it('rejects box_received with invalid location', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'box_received',
        boxId: 'b1',
        flavorId: 'f1',
        quantity: 12,
        location: { stack: -1, height: 0 },
        isOpen: false,
      })
    ).toBe(false);
  });

  it('rejects box_received with negative quantity', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'box_received',
        boxId: 'b1',
        flavorId: 'f1',
        quantity: -1,
        location: { stack: 0, height: 0 },
        isOpen: false,
      })
    ).toBe(false);
  });

  it('rejects shake_taken with invalid method', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'shake_taken',
        boxId: 'b1',
        flavorId: 'f1',
        method: 'guessing',
        pool: 'caffeinated',
      })
    ).toBe(false);
  });

  it('rejects shake_taken with invalid pool', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'shake_taken',
        boxId: 'b1',
        flavorId: 'f1',
        method: 'random',
        pool: 'energy-drink',
      })
    ).toBe(false);
  });

  it('rejects selection_cancelled with non-string non-null flavorId', () => {
    expect(
      isAppEvent({
        id: 'ev_1',
        timestamp: '2026-05-14T12:00:00.000Z',
        type: 'selection_cancelled',
        flavorId: 42,
        method: 'random',
        pool: 'caffeinated',
      })
    ).toBe(false);
  });
});
