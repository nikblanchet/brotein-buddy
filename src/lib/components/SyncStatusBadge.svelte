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

  interface Props {
    onclick?: () => void;
  }

  let { onclick }: Props = $props();

  let visible = $derived(isSyncConfigured() && $session !== null);

  let label = $derived.by(() => {
    switch ($syncStatus) {
      case 'syncing':
        return 'Syncing…';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Sync error';
      case 'conflict-pending':
        return 'Resolve conflict';
      case 'saved':
        return $pendingChanges ? 'Pending…' : 'Saved';
      case 'idle':
      default:
        return $pendingChanges ? 'Pending…' : 'Synced';
    }
  });

  let variant = $derived.by(() => {
    switch ($syncStatus) {
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
        return $pendingChanges ? 'pending' : 'ok';
    }
  });

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
    border-radius: 9999px;
    border: 1px solid var(--color-border);
    background: var(--color-background);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .badge:hover {
    background: var(--color-background-secondary);
  }

  .badge:focus-visible {
    outline: 2px solid var(--color-primary);
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
    color: var(--color-success-dark);
    background: var(--color-success-bg);
    border-color: var(--color-success-dark);
  }

  /* pending = local changes not yet pushed (e.g. debounce window) */
  .badge.pending {
    color: var(--color-text-primary);
  }

  /* syncing = push or pull in flight */
  .badge.syncing {
    color: var(--color-text-primary);
  }

  .badge.syncing .dot {
    animation: pulse 1.2s ease-in-out infinite;
  }

  /* offline = push failed, will retry on reconnect / backoff */
  .badge.offline {
    color: var(--color-info-dark);
    background: var(--color-info-bg);
    border-color: var(--color-info-dark);
  }

  /* error / conflict-pending = needs attention */
  .badge.error {
    color: var(--color-danger-dark);
    background: var(--color-danger-bg);
    border-color: var(--color-danger-dark);
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
