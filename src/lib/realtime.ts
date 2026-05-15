/**
 * Supabase Realtime subscription for the sync backend.
 *
 * Subscribes to the two tables the coordinator cares about:
 *   - `events`     INSERT — broadcast on every new timeline event
 *   - `app_states` UPDATE — broadcast on snapshot pushes (covers manual
 *                           edits that don't emit a timeline event)
 *
 * The exposed API is intentionally small: a single `subscribe(callback)`
 * that fires whenever the server tells us something changed. The coordinator
 * decides what to do (Option A semantics: re-pull). Keeping this module
 * isolated means a future event-reducer (Option B) can replace the
 * coordinator's pull-call without touching the subscription plumbing.
 *
 * RLS is the security floor: subscribers only receive rows they have
 * SELECT access to, so events for other users never reach this client.
 * The `user_id=eq.<id>` filter below is an optimisation, not a guard.
 *
 * @module lib/realtime
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Opaque handle returned by {@link subscribeToRemoteChanges}. */
export interface RealtimeSubscription {
  /** Tear down the channel. Idempotent. */
  unsubscribe(): Promise<void>;
}

/** Reason the coordinator was woken up. Surfaced for logging/testing. */
export type RemoteChangeReason = 'event-insert' | 'snapshot-update';

/**
 * Subscribes to remote writes for the given user. Calls `onChange` with the
 * reason whenever the server broadcasts a relevant change. Errors during
 * subscription bring up a noisy console message but do not throw — the
 * coordinator's polling path is the fallback.
 *
 * @param userId  - The current authenticated user's id
 * @param onChange - Invoked on every relevant broadcast
 * @returns A subscription handle whose `unsubscribe` tears down the channel
 */
export function subscribeToRemoteChanges(
  userId: string,
  onChange: (reason: RemoteChangeReason) => void
): RealtimeSubscription {
  if (!supabase) {
    return { async unsubscribe() {} };
  }

  const channel: RealtimeChannel = supabase
    .channel(`sync:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `user_id=eq.${userId}`,
      },
      () => onChange('event-insert')
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_states',
        filter: `user_id=eq.${userId}`,
      },
      () => onChange('snapshot-update')
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`Realtime channel ${status}`, err);
      }
    });

  return {
    async unsubscribe() {
      if (!supabase) return;
      await supabase.removeChannel(channel);
    },
  };
}
