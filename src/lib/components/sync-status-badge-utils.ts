/**
 * Pure display-mapping helpers for SyncStatusBadge.
 *
 * The badge collapses the sync coordinator's SyncStatus plus the
 * pendingChanges flag into a single label + variant. Kept here as pure
 * functions rather than inline $derived blocks so the mapping can be
 * unit-tested without rendering the Svelte component - the project's
 * standard split for component logic (see numberpad-utils, modal-utils).
 *
 * @module lib/components/sync-status-badge-utils
 */

import type { SyncStatus } from '$lib/sync-coordinator';

/** Visual variant class applied to the badge pill. */
export type SyncBadgeVariant = 'ok' | 'pending' | 'syncing' | 'offline' | 'error';

/**
 * Human-readable badge text for a given sync status. `pendingChanges`
 * only changes the resting states (saved / idle): a local edit not yet
 * pushed reads as "Pending…" rather than "Saved" / "Synced".
 */
export function syncBadgeLabel(status: SyncStatus, pendingChanges: boolean): string {
  switch (status) {
    case 'syncing':
      return 'Syncing…';
    case 'offline':
      return 'Offline';
    case 'error':
      return 'Sync error';
    case 'conflict-pending':
      return 'Resolve conflict';
    case 'saved':
      return pendingChanges ? 'Pending…' : 'Saved';
    case 'idle':
    default:
      return pendingChanges ? 'Pending…' : 'Synced';
  }
}

/**
 * Variant class for a given sync status. `error` and `conflict-pending`
 * share the attention-grabbing "error" treatment; the resting states
 * fall back to "pending" or "ok" depending on whether a push is queued.
 */
export function syncBadgeVariant(status: SyncStatus, pendingChanges: boolean): SyncBadgeVariant {
  switch (status) {
    case 'syncing':
      return 'syncing';
    case 'offline':
      return 'offline';
    case 'error':
    case 'conflict-pending':
      return 'error';
    case 'saved':
    case 'idle':
    default:
      return pendingChanges ? 'pending' : 'ok';
  }
}
