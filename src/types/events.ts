/**
 * Event timeline data model for BroteinBuddy.
 *
 * Events are append-only records of user-visible actions: boxes received,
 * boxes opened, shakes taken (with selection method), and "no-transaction"
 * moments like clicking "Different Choice" or "Cancel".
 *
 * The event log lives inside {@link AppState} as `events: AppEvent[]` and is
 * persisted via the standard LocalStorage save path. Each event is immutable
 * once created.
 *
 * @module types/events
 */

import { isLocation, type Location } from './models';

/**
 * How a flavor was chosen for a selection.
 *
 * - `'random'`: Weighted random pick from a pool (caffeinated or caffeine-free)
 * - `'manual'`: User picked the flavor from the choose-flavor modal
 * - `'favorite'`: User pressed the favorite-flavor quick-pick button
 */
export type EventMethod = 'random' | 'manual' | 'favorite';

/**
 * Which random pool was active for a selection, or null when the path doesn't
 * involve a pool (manual / favorite).
 *
 * Matches {@link RandomPool} from `models.ts` with `null` added.
 */
export type EventPool = 'caffeinated' | 'caffeine-free' | null;

/**
 * Fields common to every {@link AppEvent} variant.
 */
interface AppEventBase {
  /** Unique event ID, format `ev_<uuid>` */
  id: string;
  /** ISO 8601 timestamp (e.g. `2026-05-14T15:23:11.245Z`) */
  timestamp: string;
}

/** A box was added to inventory. */
export interface BoxReceivedEvent extends AppEventBase {
  type: 'box_received';
  boxId: string;
  flavorId: string;
  quantity: number;
  location: Location;
  isOpen: boolean;
}

/** A previously-sealed box transitioned to open. */
export interface BoxOpenedEvent extends AppEventBase {
  type: 'box_opened';
  boxId: string;
  flavorId: string;
}

/** A box was deleted from inventory. */
export interface BoxRemovedEvent extends AppEventBase {
  type: 'box_removed';
  boxId: string;
  flavorId: string;
  finalQuantity: number;
}

/** A shake was confirmed and the box quantity decremented. */
export interface ShakeTakenEvent extends AppEventBase {
  type: 'shake_taken';
  boxId: string;
  flavorId: string;
  method: EventMethod;
  pool: EventPool;
}

/** The user clicked "Different Choice" instead of confirming a suggestion. */
export interface ShakeRejectedEvent extends AppEventBase {
  type: 'shake_rejected';
  rejectedFlavorId: string;
  method: EventMethod;
  pool: EventPool;
}

/** The user cancelled out of the confirm screen without taking a shake. */
export interface SelectionCancelledEvent extends AppEventBase {
  type: 'selection_cancelled';
  flavorId: string | null;
  method: EventMethod;
  pool: EventPool;
}

/**
 * Discriminated union of every event type the application records.
 *
 * Add a new variant by:
 *   1. Defining the interface above with a unique `type` literal.
 *   2. Adding it to this union.
 *   3. Extending {@link isAppEvent} with a guard branch.
 *   4. Emitting it from the relevant store action.
 *
 * Existing variants are stable; do not change their shape without a schema
 * version bump and migration.
 */
export type AppEvent =
  | BoxReceivedEvent
  | BoxOpenedEvent
  | BoxRemovedEvent
  | ShakeTakenEvent
  | ShakeRejectedEvent
  | SelectionCancelledEvent;

/** All valid `type` discriminator values for {@link AppEvent}. */
export type AppEventType = AppEvent['type'];

const EVENT_METHODS: readonly EventMethod[] = ['random', 'manual', 'favorite'];

function isEventMethod(value: unknown): value is EventMethod {
  return typeof value === 'string' && (EVENT_METHODS as readonly string[]).includes(value);
}

function isEventPool(value: unknown): value is EventPool {
  return value === 'caffeinated' || value === 'caffeine-free' || value === null;
}

function hasBaseFields(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.timestamp === 'string' &&
    value.timestamp.length > 0
  );
}

/**
 * Type guard for the {@link AppEvent} discriminated union.
 *
 * Validates the shared base fields plus the variant-specific payload. Used by
 * the AppState schema validator so corrupted events in storage are rejected
 * before they reach the UI.
 *
 * @param value - The value to check
 * @returns true if value is a valid AppEvent
 */
export function isAppEvent(value: unknown): value is AppEvent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  if (!hasBaseFields(v)) return false;

  switch (v.type) {
    case 'box_received':
      return (
        typeof v.boxId === 'string' &&
        typeof v.flavorId === 'string' &&
        typeof v.quantity === 'number' &&
        Number.isInteger(v.quantity) &&
        v.quantity >= 0 &&
        typeof v.isOpen === 'boolean' &&
        isLocation(v.location)
      );

    case 'box_opened':
      return typeof v.boxId === 'string' && typeof v.flavorId === 'string';

    case 'box_removed':
      return (
        typeof v.boxId === 'string' &&
        typeof v.flavorId === 'string' &&
        typeof v.finalQuantity === 'number' &&
        Number.isInteger(v.finalQuantity) &&
        v.finalQuantity >= 0
      );

    case 'shake_taken':
      return (
        typeof v.boxId === 'string' &&
        typeof v.flavorId === 'string' &&
        isEventMethod(v.method) &&
        isEventPool(v.pool)
      );

    case 'shake_rejected':
      return (
        typeof v.rejectedFlavorId === 'string' && isEventMethod(v.method) && isEventPool(v.pool)
      );

    case 'selection_cancelled':
      return (
        (v.flavorId === null || typeof v.flavorId === 'string') &&
        isEventMethod(v.method) &&
        isEventPool(v.pool)
      );

    default:
      return false;
  }
}
