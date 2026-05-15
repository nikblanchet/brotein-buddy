/**
 * Sync coordinator: wires the local Svelte store to the Supabase backend.
 *
 * Public surface:
 *   - `initializeSync()` — call once at app boot. Idempotent.
 *   - `syncStatus`, `lastSyncedAt`, `pendingConflict`, `lastError`,
 *     `pendingChanges` — readable stores for the UI.
 *   - `resolveConflict(choice)` — called by the conflict modal.
 *
 * Behaviour (PR 3):
 *   - On auth events (SIGNED_IN, INITIAL_SESSION): reconcile local vs
 *     remote using persistent sync metadata (lib/sync-meta). The dirty bit
 *     prevents the Burning Man footgun where reloading the app would
 *     silently overwrite 10 days of offline edits with a stale server pull.
 *   - On any local mutation while signed in: mark meta.dirty, debounce a
 *     push (2.5 s default). On push failure, enter "offline" mode and
 *     schedule exponential-backoff retry (cap 60 s).
 *   - `window.online` events: cancel the backoff and retry immediately.
 *   - After a successful reconcile, subscribe to Supabase Realtime so
 *     remote writes from other devices trigger a re-pull (Option A
 *     semantics — see ADR-013).
 *   - On sign-out: cancel everything, unsubscribe from realtime, clear
 *     sync metadata. Local state itself is left alone.
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
import { loadSyncMeta, saveSyncMeta, clearSyncMeta, type SyncMeta } from './sync-meta';
import { subscribeToRemoteChanges, type RealtimeSubscription } from './realtime';
import type { AppState } from '../types/models';

export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error' | 'offline' | 'conflict-pending';

const statusStore = writable<SyncStatus>('idle');
const lastSyncedAtStore = writable<Date | null>(null);
const pendingConflictStore = writable<RemoteStateSummary | null>(null);
const lastErrorStore = writable<string | null>(null);
const pendingChangesStore = writable<boolean>(false);

/** Current sync status. Drives the badge + Sync modal status line. */
export const syncStatus: Readable<SyncStatus> = { subscribe: statusStore.subscribe };

/** When the last successful push or pull completed. */
export const lastSyncedAt: Readable<Date | null> = { subscribe: lastSyncedAtStore.subscribe };

/** Non-null when sign-in needs the conflict modal. */
export const pendingConflict: Readable<RemoteStateSummary | null> = {
  subscribe: pendingConflictStore.subscribe,
};

/** Last sync error message, or null. */
export const lastError: Readable<string | null> = { subscribe: lastErrorStore.subscribe };

/** True when local has changes the server doesn't have yet. */
export const pendingChanges: Readable<boolean> = { subscribe: pendingChangesStore.subscribe };

let initialized = false;
let pushDelayMs = 2500;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let suppressNextChange = false;
let currentSession: Session | null = null;
let conflictLocalSnapshot: AppState | null = null;

// PR 3 retry/realtime state.
const MAX_BACKOFF_MS = 60_000;
let isKnownOffline = false;
let retryAttempt = 0;
let backoffTimer: ReturnType<typeof setTimeout> | null = null;
let realtimeSub: RealtimeSubscription | null = null;
let onlineHandler: (() => void) | null = null;

let authEventQueue: Promise<void> = Promise.resolve();

/** Wires the coordinator to auth + store events. Call once at app boot. */
export function initializeSync(): void {
  if (initialized) return;
  if (!isSyncConfigured() || !supabase) return;
  initialized = true;

  // Surface persisted dirty state immediately so the badge shows
  // "unsynced" before the first auth event lands.
  pendingChangesStore.set(loadSyncMeta().dirty);

  supabase.auth.onAuthStateChange((event, session) => {
    authEventQueue = authEventQueue
      .catch(() => {})
      .then(() => handleAuthEvent(event, session))
      .catch((err) => recordError(err));
  });

  appState.subscribe((state) => {
    if (suppressNextChange) {
      suppressNextChange = false;
      return;
    }
    markDirty();
    if (!currentSession) return;
    if (get(pendingConflictStore) !== null) return;
    schedulePush(state);
  });

  if (typeof window !== 'undefined') {
    onlineHandler = () => {
      if (!currentSession) return;
      // 'online' is a signal, not a guarantee — captive portals can still
      // block real traffic. We cancel the backoff and try once; if it
      // fails, the normal retry chain kicks back in.
      if (backoffTimer) {
        clearTimeout(backoffTimer);
        backoffTimer = null;
      }
      retryAttempt = 0;
      isKnownOffline = false;
      void runPush(get(appState));
    };
    window.addEventListener('online', onlineHandler);
  }
}

/** Test hook: override the push debounce. */
export function setPushDelay(ms: number): void {
  pushDelayMs = ms;
}

/**
 * Test-only teardown. Clears every timer this module set up and removes
 * the `online` listener so a previous test's pending work cannot fire
 * into the next test. Production code never calls this.
 */
export function __resetForTests(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  if (backoffTimer) clearTimeout(backoffTimer);
  backoffTimer = null;
  if (typeof window !== 'undefined' && onlineHandler) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }
}

async function handleAuthEvent(event: AuthChangeEvent, session: Session | null): Promise<void> {
  currentSession = session;

  if (event === 'SIGNED_OUT' || session === null) {
    cancelPendingPush();
    cancelBackoff();
    pendingConflictStore.set(null);
    statusStore.set('idle');
    clearSyncMeta();
    pendingChangesStore.set(false);
    if (realtimeSub) {
      await realtimeSub.unsubscribe();
      realtimeSub = null;
    }
    return;
  }

  if (event === 'SIGNED_IN') {
    // SIGNED_IN may reflect a different user than whatever's in the local
    // store — force the dirty/conflict path so we never silently adopt
    // local data into a freshly-authenticated session.
    await reconcileSync({ treatLocalAsDirty: true });
    await ensureRealtime(session);
    return;
  }

  if (event === 'INITIAL_SESSION') {
    await reconcileSync({ treatLocalAsDirty: false });
    await ensureRealtime(session);
    return;
  }

  // TOKEN_REFRESHED, USER_UPDATED, etc. — no sync action needed.
}

/**
 * The single reconciliation path. Compares local vs remote using persisted
 * metadata and either pushes, pulls, surfaces a conflict, or no-ops.
 *
 * @param opts.treatLocalAsDirty - When true, any non-empty local state is
 *   treated as "dirty" regardless of `meta.dirty`. Used on SIGNED_IN where
 *   the local store might belong to a previous user.
 */
async function reconcileSync(opts: { treatLocalAsDirty: boolean }): Promise<void> {
  statusStore.set('syncing');
  try {
    const remote = await peekRemoteState();
    const local = get(appState);
    const meta = loadSyncMeta();

    const localHasData = !isLocallyEmpty(local);
    const localDirty = opts.treatLocalAsDirty
      ? localHasData
      : meta.dirty || (localHasData && meta.lastSyncedAt === null);
    const remoteFresher =
      remote.exists &&
      (meta.lastServerUpdatedAt === null ||
        (remote.updatedAt !== null && remote.updatedAt > meta.lastServerUpdatedAt));

    if (!remote.exists) {
      // No row on server yet — push to create it. Empty pushes are fine.
      await pushAndPersist(local);
      return;
    }

    if (localDirty && remoteFresher) {
      // True conflict: both sides have unsynced changes.
      conflictLocalSnapshot = local;
      pendingConflictStore.set(remote);
      statusStore.set('conflict-pending');
      return;
    }

    if (localDirty) {
      await pushAndPersist(local);
      return;
    }

    if (remoteFresher) {
      const pulled = await pullFullState();
      if (pulled) {
        applyServerState(pulled);
        persistAfterSync(remote.updatedAt);
        markSynced();
      } else {
        // Server row disappeared between peek and pull (rare TOCTOU —
        // e.g. an admin wipe, or "Keep this device" from another tab
        // mid-flight). Don't mark synced with stale meta; leave the
        // status alone so the next reconcile retries from a clean
        // starting point.
        recordError(new SyncError('Remote row vanished between peek and pull.'));
      }
      return;
    }

    // Nothing to do — already in sync.
    markSynced();
  } catch (err) {
    recordError(err);
    enterOfflineMode();
  }
}

async function ensureRealtime(session: Session): Promise<void> {
  if (realtimeSub) return;
  realtimeSub = subscribeToRemoteChanges(session.user.id, () => {
    // Remote write detected. Re-reconcile with the meta-based logic —
    // loopback from our own writes is filtered out naturally because
    // remote.updated_at == meta.lastServerUpdatedAt after a fresh push.
    if (get(pendingConflictStore) !== null) return;
    void reconcileSync({ treatLocalAsDirty: false });
  });
}

/**
 * Resolves a pending sign-in conflict. Called by the conflict modal.
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
      await pushAndPersist(local);
    } else {
      const pulled = await pullFullState();
      if (pulled) {
        applyServerState(pulled);
        persistAfterSync(summary.updatedAt);
      }
      markSynced();
    }

    pendingConflictStore.set(null);
    conflictLocalSnapshot = null;
  } catch (err) {
    recordError(err);
    enterOfflineMode();
  }
}

function schedulePush(state: AppState): void {
  // While known-offline, don't reset the backoff with every keystroke —
  // we'd retry at 2.5 s forever and waste battery on the playa. The
  // backoff timer + 'online' event handle reconnection.
  if (isKnownOffline) {
    statusStore.set('offline');
    return;
  }
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
    const updatedAt = await pushFullState(state);
    persistAfterSync(updatedAt);
    exitOfflineMode();
    markSynced();
  } catch (err) {
    recordError(err);
    enterOfflineMode();
  }
}

async function pushAndPersist(state: AppState): Promise<void> {
  const updatedAt = await pushFullState(state);
  persistAfterSync(updatedAt);
  markSynced();
}

function persistAfterSync(serverUpdatedAt: string | null): void {
  const meta: SyncMeta = {
    dirty: false,
    lastServerUpdatedAt: serverUpdatedAt,
    lastSyncedAt: new Date().toISOString(),
  };
  saveSyncMeta(meta);
  pendingChangesStore.set(false);
}

function markDirty(): void {
  const meta = loadSyncMeta();
  if (meta.dirty) return; // already dirty, skip rewrite
  saveSyncMeta({ ...meta, dirty: true });
  pendingChangesStore.set(true);
}

function enterOfflineMode(): void {
  isKnownOffline = true;
  statusStore.set('offline');
  scheduleBackoffRetry();
}

function exitOfflineMode(): void {
  isKnownOffline = false;
  retryAttempt = 0;
  cancelBackoff();
}

function scheduleBackoffRetry(): void {
  if (backoffTimer) return; // already pending
  const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** retryAttempt);
  retryAttempt += 1;
  backoffTimer = setTimeout(() => {
    backoffTimer = null;
    void runPush(get(appState));
  }, delay);
}

function cancelBackoff(): void {
  if (backoffTimer) {
    clearTimeout(backoffTimer);
    backoffTimer = null;
  }
  retryAttempt = 0;
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
  // Don't overwrite 'offline' status — enterOfflineMode wins for the
  // user-visible state. recordError just captures the message.
  if (get(statusStore) !== 'offline') {
    statusStore.set('error');
  }
  console.error('Sync error:', err);
}
