/**
 * Sync coordinator: wires the local Svelte store to the Supabase backend.
 *
 * Public surface:
 *   - `initializeSync()` — call once at app boot. Idempotent.
 *   - `syncStatus`, `lastSyncedAt`, `pendingConflict` — readable stores for
 *     the UI to drive the status indicator and conflict modal.
 *   - `resolveConflict(choice)` — called by the conflict modal when the
 *     user picks a side.
 *
 * Behaviour:
 *   - On page load with an existing session: silently pull the server state
 *     and replace local. (INITIAL_SESSION auth event.)
 *   - On fresh sign-in (SIGNED_IN auth event): peek at the server.
 *     If both sides have data, surface a conflict for the modal to resolve.
 *     Otherwise push (seed empty server) or pull (replace empty local).
 *   - While signed in: debounced push of the full state on every local
 *     mutation. Default debounce is 2.5 s; tunable via `setPushDelay()` for
 *     tests.
 *   - On sign-out: cancel pending pushes; status -> 'idle'.
 *
 * Out of scope for PR 2 (lives in PR 3):
 *   - Realtime subscribe to server-side changes
 *   - Offline queue / retry-on-reconnect
 *   - Field-level merge / CRDT
 *
 * @module lib/sync-coordinator
 */

import { writable, get, type Readable } from 'svelte/store';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase, isSyncConfigured } from './supabase';
import { appState, replaceAppState } from './stores';
import {
  pushFullState,
  pullFullState,
  peekRemoteState,
  clearRemoteState,
  SyncError,
  type RemoteStateSummary,
} from './sync';
import type { AppState } from '../types/models';

export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error' | 'conflict-pending';

const statusStore = writable<SyncStatus>('idle');
const lastSyncedAtStore = writable<Date | null>(null);
const pendingConflictStore = writable<RemoteStateSummary | null>(null);
const lastErrorStore = writable<string | null>(null);

/**
 * Current sync status. Drives the small Saved / Syncing… indicator and
 * the conflict modal visibility (`conflict-pending`).
 */
export const syncStatus: Readable<SyncStatus> = { subscribe: statusStore.subscribe };

/** When the last successful push or pull completed. */
export const lastSyncedAt: Readable<Date | null> = { subscribe: lastSyncedAtStore.subscribe };

/**
 * Non-null when the sign-in flow detected data on both sides and is
 * waiting for the user to choose. The modal subscribes to this.
 */
export const pendingConflict: Readable<RemoteStateSummary | null> = {
  subscribe: pendingConflictStore.subscribe,
};

/** Last sync error message, or null. UI may surface in the indicator. */
export const lastError: Readable<string | null> = { subscribe: lastErrorStore.subscribe };

let initialized = false;
let pushDelayMs = 2500;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let suppressNextChange = false;
let currentSession: Session | null = null;
let conflictLocalSnapshot: AppState | null = null;

/**
 * Promise chain that serializes auth-event handling. supabase-js fires
 * INITIAL_SESSION and SIGNED_IN back-to-back when a magic link is clicked
 * on a device that already has a cached session; without serialization
 * the two `async` handlers race and a slow pull can land after a fast
 * conflict resolution, corrupting state. Each new event awaits the
 * previous handler before its own work begins.
 */
let authEventQueue: Promise<void> = Promise.resolve();

/**
 * Wires the coordinator to auth + store events. Call once at app boot.
 * Subsequent calls are no-ops.
 */
export function initializeSync(): void {
  if (initialized) return;
  if (!isSyncConfigured() || !supabase) return;
  initialized = true;

  supabase.auth.onAuthStateChange((event, session) => {
    authEventQueue = authEventQueue
      .catch(() => {
        // Swallow earlier errors so they don't poison the chain — they're
        // already surfaced via recordError on the previous tick.
      })
      .then(() => handleAuthEvent(event, session))
      .catch((err) => recordError(err));
  });

  appState.subscribe((state) => {
    if (suppressNextChange) {
      suppressNextChange = false;
      return;
    }
    if (!currentSession) return;
    if (get(pendingConflictStore) !== null) return;
    schedulePush(state);
  });
}

/**
 * Test hook: override the push debounce. Real code uses the default 2.5 s.
 */
export function setPushDelay(ms: number): void {
  pushDelayMs = ms;
}

async function handleAuthEvent(event: AuthChangeEvent, session: Session | null): Promise<void> {
  currentSession = session;

  if (event === 'SIGNED_OUT' || session === null) {
    cancelPendingPush();
    pendingConflictStore.set(null);
    statusStore.set('idle');
    return;
  }

  if (event === 'SIGNED_IN') {
    await reconcileOnSignIn();
    return;
  }

  if (event === 'INITIAL_SESSION') {
    await silentPullIfPresent();
    return;
  }

  // TOKEN_REFRESHED, USER_UPDATED, etc. — no sync action needed.
}

async function reconcileOnSignIn(): Promise<void> {
  statusStore.set('syncing');
  try {
    const remote = await peekRemoteState();
    const local = get(appState);

    if (!remote.exists) {
      // Server is empty — seed it from whatever we have locally (even if
      // local is also empty, the push creates the row).
      await pushFullState(local);
      markSynced();
      return;
    }

    if (isLocallyEmpty(local)) {
      // Server has data, local is fresh — adopt the server.
      const pulled = await pullFullState();
      if (pulled) applyServerState(pulled);
      markSynced();
      return;
    }

    // Both sides have data: pause and let the UI present a chooser.
    conflictLocalSnapshot = local;
    pendingConflictStore.set(remote);
    statusStore.set('conflict-pending');
  } catch (err) {
    recordError(err);
  }
}

async function silentPullIfPresent(): Promise<void> {
  if (!currentSession) return;
  statusStore.set('syncing');
  try {
    const pulled = await pullFullState();
    if (pulled) applyServerState(pulled);
    markSynced();
  } catch (err) {
    recordError(err);
  }
}

/**
 * Resolves a pending sign-in conflict. Called by the conflict modal.
 *
 * - `keep-local` wipes the server and re-pushes local.
 * - `keep-server` replaces local with the server state.
 * - `cancel` signs out so no data is touched.
 */
export async function resolveConflict(
  choice: 'keep-local' | 'keep-server' | 'cancel'
): Promise<void> {
  const summary = get(pendingConflictStore);
  if (!summary) return;

  statusStore.set('syncing');

  try {
    if (choice === 'cancel') {
      if (supabase) await supabase.auth.signOut();
      pendingConflictStore.set(null);
      conflictLocalSnapshot = null;
      statusStore.set('idle');
      return;
    }

    if (choice === 'keep-local') {
      const local = conflictLocalSnapshot ?? get(appState);
      await clearRemoteState();
      await pushFullState(local);
    } else {
      const pulled = await pullFullState();
      if (pulled) applyServerState(pulled);
    }

    pendingConflictStore.set(null);
    conflictLocalSnapshot = null;
    markSynced();
  } catch (err) {
    recordError(err);
  }
}

function schedulePush(state: AppState): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void runPush(state);
  }, pushDelayMs);
  statusStore.set('syncing');
}

async function runPush(state: AppState): Promise<void> {
  if (!currentSession) return;
  try {
    await pushFullState(state);
    markSynced();
  } catch (err) {
    recordError(err);
  }
}

function cancelPendingPush(): void {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
}

function applyServerState(state: AppState): void {
  suppressNextChange = true;
  replaceAppState(state);
}

function isLocallyEmpty(state: AppState): boolean {
  return state.boxes.length === 0 && state.flavors.length === 0 && state.events.length === 0;
}

function markSynced(): void {
  statusStore.set('saved');
  lastSyncedAtStore.set(new Date());
  lastErrorStore.set(null);
}

function recordError(err: unknown): void {
  const message =
    err instanceof SyncError ? err.message : err instanceof Error ? err.message : 'Sync error';
  lastErrorStore.set(message);
  statusStore.set('error');
  console.error('Sync error:', err);
}
