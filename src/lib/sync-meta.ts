/**
 * Persistent sync metadata: did local change since the last successful sync,
 * and what was the server's snapshot timestamp at that point?
 *
 * Lives in its own LocalStorage key (separate from AppState) so the
 * coordinator's bookkeeping doesn't pollute the user-facing data schema —
 * and so we don't need a schema-version bump just to remember "dirty".
 *
 * The dirty bit is the load-bearing piece for offline-first behaviour:
 * after 10 days at Burning Man with a tab reload mid-trip, the coordinator
 * must know NOT to silently pull (which would overwrite local edits with
 * the stale server view).
 *
 * @module lib/sync-meta
 */

const KEY = 'BROTEINBUDDY_SYNC_META';

/** Coordinator's view of sync state, persisted across page loads. */
export interface SyncMeta {
  /**
   * True when the local AppState has changed since the last successful
   * push. Set on every appState mutation; cleared on successful push.
   */
  dirty: boolean;

  /**
   * The server's `app_states.updated_at` value from our last successful
   * push or pull. Used on app boot to detect whether the server has
   * changed under us while we weren't looking.
   */
  lastServerUpdatedAt: string | null;

  /**
   * Wall-clock time of the last successful push or pull. Surfaces in the
   * Sync modal's "Last synced" line.
   */
  lastSyncedAt: string | null;
}

const EMPTY_META: SyncMeta = {
  dirty: false,
  lastServerUpdatedAt: null,
  lastSyncedAt: null,
};

/**
 * Loads the coordinator's metadata from LocalStorage. Returns defaults if
 * the key is missing or malformed — corrupted metadata is never fatal.
 */
export function loadSyncMeta(): SyncMeta {
  try {
    if (typeof localStorage === 'undefined') return { ...EMPTY_META };
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_META };
    const parsed = JSON.parse(raw) as Partial<SyncMeta>;
    return {
      dirty: typeof parsed.dirty === 'boolean' ? parsed.dirty : false,
      lastServerUpdatedAt:
        typeof parsed.lastServerUpdatedAt === 'string' ? parsed.lastServerUpdatedAt : null,
      lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
    };
  } catch {
    return { ...EMPTY_META };
  }
}

/** Saves the coordinator's metadata to LocalStorage. */
export function saveSyncMeta(meta: SyncMeta): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch (err) {
    console.warn('Failed to persist sync metadata:', err);
  }
}

/** Clears the metadata (used on sign-out + by tests). */
export function clearSyncMeta(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(KEY);
  } catch {
    /* swallow */
  }
}
