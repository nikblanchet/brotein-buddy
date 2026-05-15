<script lang="ts">
  /**
   * Small, always-visible sync status badge.
   *
   * Lives in the Inventory header. Renders only when the user is signed in
   * AND sync is configured — otherwise it's null. The badge surfaces the
   * coordinator's syncStatus + pendingChanges flag in a single compact pill
   * so the user knows whether their last edit has reached the server.
   *
   * Tap the badge to open the Sync modal for details / sign-out.
   *
   * @component
   */

  import { session } from '$lib/auth';
  import { syncStatus, pendingChanges, lastSyncedAt } from '$lib/sync-coordinator';
  import { isSyncConfigured } from '$lib/supabase';
  import { syncBadgeLabel, syncBadgeVariant } from './sync-status-badge-utils';

  interface Props {
    onclick?: () => void;
  }

  let { onclick }: Props = $props();

  let visible = $derived(isSyncConfigured() && $session !== null);

  let label = $derived(syncBadgeLabel($syncStatus, $pendingChanges));
  let variant = $derived(syncBadgeVariant($syncStatus, $pendingChanges));

  let title = $derived.by(() => {
    if ($lastSyncedAt) {
      return `Last synced: ${$lastSyncedAt.toLocaleString()}`;
    }
    return 'Never synced';
  });
</script>

{#if visible}
  <button
    type="button"
    class="badge {variant}"
    {onclick}
    aria-label={`Sync status: ${label}. Click to open sync settings.`}
    aria-haspopup="dialog"
    {title}
    data-testid="sync-status-badge"
    data-variant={variant}
  >
    <span class="dot" aria-hidden="true"></span>
    <span class="label" aria-live="polite" aria-atomic="true">{label}</span>
  </button>
{/if}

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--r-full);
    border: 1px solid var(--line-1);
    background: var(--surface-card);
    color: var(--ink-2);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .badge:hover {
    background: var(--surface-hover);
  }

  .badge:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }

  /* ok = synced, no pending changes */
  .badge.ok {
    color: var(--success);
    background: var(--success-soft);
    border-color: var(--success);
  }

  /* pending = local changes not yet pushed (e.g. debounce window) */
  .badge.pending {
    color: var(--ink-1);
  }

  /* syncing = push or pull in flight */
  .badge.syncing {
    color: var(--ink-1);
  }

  .badge.syncing .dot {
    animation: pulse 1.2s ease-in-out infinite;
  }

  /* offline = push failed, will retry on reconnect / backoff */
  .badge.offline {
    color: var(--info);
    background: var(--info-soft);
    border-color: var(--info);
  }

  /* error / conflict-pending = needs attention */
  .badge.error {
    color: var(--danger);
    background: var(--danger-soft);
    border-color: var(--danger);
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
</style>
