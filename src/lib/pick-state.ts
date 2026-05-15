/**
 * Ephemeral pick-flow state.
 *
 * Holds the result of the most recent pool/favorite/manual pick so the
 * PickResultSheet (mounted as a sibling of .app-shell, not as a child of
 * the Pick route) can read it. Cleared when the user takes the shake,
 * dismisses the sheet, or asks for another pick.
 *
 * NOT persisted to localStorage - if the page is reloaded mid-pick, the
 * sheet is closed.
 *
 * @module lib/pick-state
 */

import { writable } from 'svelte/store';
import type { EventMethod } from '../types/events';
import type { RandomPool } from '../types/models';

/**
 * A snapshot of "we just picked this box for this flavor via this method".
 *
 * Carries enough context to (a) render the result sheet, (b) re-run the
 * same pool when the user taps "Pick again", and (c) emit the timeline
 * event with the right `method` and `pool` when the user commits.
 */
export type PickResult = {
  /** Box selected by `selectPriorityBox` for the chosen flavor */
  readonly boxId: string;
  /** Flavor that was chosen */
  readonly flavorId: string;
  /** How the user reached this pick - drives the timeline event method */
  readonly method: EventMethod;
  /**
   * Pool used for the pick (random flow only). null for favorite/manual
   * picks that didn't go through a pool.
   */
  readonly pool: RandomPool | null;
};

/**
 * The most recent pick result, or null when the result sheet is closed.
 * Setting this to a value opens the sheet; setting it back to null
 * closes the sheet.
 */
export const pickResult = writable<PickResult | null>(null);

/**
 * Clear the active pick result. Use after committing/cancelling.
 */
export function clearPickResult(): void {
  pickResult.set(null);
}
