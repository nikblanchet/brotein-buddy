/**
 * Pure factories for building {@link AppEvent} records.
 *
 * Separated from the store so events can be constructed and tested without
 * pulling in Svelte / LocalStorage dependencies. The store imports
 * {@link createEvent} and appends the result to `state.events`.
 *
 * @module lib/events
 */

import type { AppEvent, AppEventType } from '../types/events';

/** Variant of {@link AppEvent} that has the discriminator `type`. */
type EventOf<T extends AppEventType> = Extract<AppEvent, { type: T }>;

/** The variant-specific payload — everything except the base fields. */
type EventPayload<T extends AppEventType> = Omit<EventOf<T>, 'id' | 'timestamp' | 'type'>;

/**
 * Builds an {@link AppEvent} of the requested type, filling in a fresh id and
 * the current timestamp.
 *
 * Uses `crypto.randomUUID()` (matches `lib/utils/id.ts`) and
 * `new Date().toISOString()`. The factory is deterministic given mocked time
 * and uuid sources, which keeps the unit tests stable.
 *
 * @param type - The event variant to construct
 * @param payload - Variant-specific fields (no id, timestamp, or type)
 * @returns A fully-formed event ready to append to the timeline
 *
 * @example
 * const ev = createEvent('shake_taken', {
 *   boxId: 'box_123',
 *   flavorId: 'flavor_chocolate',
 *   method: 'random',
 *   pool: 'caffeinated',
 * });
 */
export function createEvent<T extends AppEventType>(type: T, payload: EventPayload<T>): EventOf<T> {
  return {
    id: `ev_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    type,
    ...payload,
  } as EventOf<T>;
}
