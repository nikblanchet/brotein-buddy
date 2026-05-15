<script lang="ts">
  /**
   * Sync & Account sheet.
   *
   * Bottom sheet on phone, right side panel on laptop - the same
   * responsive .sheet pattern as AddInventoryPanel and FlavorPickerSheet.
   * Mounted once as a sibling of .app-shell from App.svelte and driven by
   * the syncSheetOpen store, so both the More screen's Sync row and the
   * topbar SyncStatusBadge can open it without prop drilling.
   *
   * Three states, switched by the current Supabase session:
   *   - Not configured: a notice that the Supabase env vars are missing.
   *   - Signed out:      email input + "Send magic link" button.
   *   - Signed in:       email display + sync status + sign-out button.
   *
   * The sheet does not own the sync state machine - it observes the
   * stores from lib/sync-coordinator and the session store from lib/auth.
   * The coordinator handles push/pull and conflict resolution itself.
   *
   * @component
   */

  import Button from './Button.svelte';
  import { session, sendMagicLink, signOut, AuthError, SyncNotConfiguredError } from '$lib/auth';
  import { syncStatus, lastSyncedAt, lastError } from '$lib/sync-coordinator';
  import { isSyncConfigured } from '$lib/supabase';
  import { syncSheetOpen } from '$lib/sync-ui-state';

  let email = $state('');
  let stage = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
  let errorMessage = $state('');

  /**
   * Reset the transient send-link state whenever the sheet closes, so
   * reopening it always starts from a clean idle form.
   */
  $effect(() => {
    if (!$syncSheetOpen) {
      stage = 'idle';
      errorMessage = '';
    }
  });

  function close() {
    syncSheetOpen.set(false);
  }

  /**
   * Escape closes the sheet, matching the dialog pattern. Attached only
   * while the sheet is open.
   */
  $effect(() => {
    if (!$syncSheetOpen) return;
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });

  async function handleSendLink() {
    stage = 'sending';
    errorMessage = '';
    try {
      await sendMagicLink(email);
      stage = 'sent';
    } catch (err) {
      stage = 'error';
      errorMessage =
        err instanceof AuthError || err instanceof SyncNotConfiguredError
          ? err.message
          : 'Failed to send magic link.';
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Sign out failed.';
    }
  }

  function formatRelative(date: Date | null): string {
    if (!date) return 'never';
    const diffMs = Date.now() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function statusLabel(status: typeof $syncStatus): string {
    switch (status) {
      case 'idle':
        return 'Idle';
      case 'syncing':
        return 'Syncing…';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Error';
      case 'offline':
        return 'Offline — changes saved locally';
      case 'conflict-pending':
        return 'Waiting on conflict resolution';
    }
  }
</script>

{#if $syncSheetOpen}
  <button
    type="button"
    class="sheet-backdrop"
    aria-label="Close sync settings"
    onclick={close}
    data-testid="sync-sheet-backdrop"
  ></button>
{/if}

<div
  class="sheet sync-account"
  class:open={$syncSheetOpen}
  role="dialog"
  aria-modal="true"
  aria-label="Sync and Account"
  aria-hidden={!$syncSheetOpen}
  inert={!$syncSheetOpen}
  data-testid="sync-account-sheet"
>
  <div class="grabber" aria-hidden="true"></div>

  <div class="panel-head">
    <h2>Sync &amp; Account</h2>
    <button class="icon-btn" onclick={close} aria-label="Close" data-testid="sync-sheet-close">
      ✕
    </button>
  </div>

  <div class="panel-body">
    {#if !isSyncConfigured()}
      <div class="not-configured">
        <p class="explainer">
          Sync is not configured for this build. Set <code>VITE_SUPABASE_URL</code> and
          <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code> (see
          <code>supabase/README.md</code>) to enable multi-device sync.
        </p>
      </div>
    {:else if $session === null}
      <div class="signed-out">
        <p class="explainer">
          Sign in to sync inventory across your devices. Type your email and we'll send a one-tap
          magic link — no password.
        </p>

        <label class="field">
          <span>Email</span>
          <input
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            disabled={stage === 'sending'}
            autocomplete="email"
            data-testid="sync-modal-email-input"
          />
        </label>

        {#if stage === 'sent'}
          <p class="success" role="status">
            Magic link sent. Check your inbox and click the link to sign in.
          </p>
        {:else if stage === 'error'}
          <p class="error" role="alert">{errorMessage}</p>
        {/if}

        <div class="actions">
          <Button
            variant="primary"
            size="base"
            disabled={stage === 'sending' || email.trim().length === 0}
            onclick={handleSendLink}
            testId="sync-modal-send-link-button"
          >
            {stage === 'sending' ? 'Sending…' : 'Send magic link'}
          </Button>
        </div>
      </div>
    {:else}
      <div class="signed-in">
        <p class="explainer">Signed in as <strong>{$session.user.email}</strong></p>

        <dl class="status-grid">
          <dt>Status</dt>
          <dd data-testid="sync-modal-status">{statusLabel($syncStatus)}</dd>
          <dt>Last synced</dt>
          <dd>{formatRelative($lastSyncedAt)}</dd>
        </dl>

        {#if $lastError}
          <p class="error" role="alert">{$lastError}</p>
        {/if}

        <div class="actions">
          <Button
            variant="danger"
            size="base"
            onclick={handleSignOut}
            testId="sync-modal-sign-out-button"
          >
            Sign out
          </Button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /*
   * Sheet shell - the same phone-sheet / laptop-side-panel pattern used
   * by AddInventoryPanel and FlavorPickerSheet. The closed sheet stays
   * mounted (translated off-viewport) so the slide animation can run;
   * pointer-events: none keeps it from occluding the screen underneath.
   */
  .sheet {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 92%;
    background: var(--surface-card);
    border-top-left-radius: 18px;
    border-top-right-radius: 18px;
    z-index: 10;
    transform: translateY(100%);
    transition: transform var(--transition-pop);
    display: flex;
    flex-direction: column;
    box-shadow: 0 -8px 32px oklch(0 0 0 / 0.15);
    overflow: hidden;
    pointer-events: none;
  }

  .sheet.open {
    transform: translateY(0);
    pointer-events: auto;
  }

  .sheet-backdrop {
    position: absolute;
    inset: 0;
    background: oklch(0 0 0 / 0.32);
    z-index: 9;
    border: 0;
    padding: 0;
    cursor: pointer;
    animation: fade-in 180ms ease;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .grabber {
    width: 36px;
    height: 4px;
    background: var(--line-2);
    border-radius: 999px;
    margin: 8px auto 4px;
    flex-shrink: 0;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px 12px;
    border-bottom: 1px solid var(--line-1);
  }

  .panel-head h2 {
    margin: 0;
    font-size: 16px;
    font-weight: var(--font-weight-semibold);
    letter-spacing: -0.01em;
  }

  .icon-btn {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    width: 36px;
    height: 36px;
    border-radius: var(--r-md);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
  }

  .icon-btn:hover {
    background: var(--surface-hover);
    color: var(--ink-1);
  }

  .panel-body {
    overflow-y: auto;
    padding: 20px;
    flex: 1;
  }

  /* Per-state content layout */
  .signed-out,
  .signed-in,
  .not-configured {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .explainer {
    margin: 0;
    color: var(--ink-2);
    line-height: 1.5;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .field span {
    font-weight: var(--font-weight-medium);
    color: var(--ink-1);
  }

  .field input {
    padding: var(--space-3);
    font-size: var(--font-size-base);
    border: 1px solid var(--line-1);
    border-radius: var(--r-md);
    background: var(--surface-card);
    color: var(--ink-1);
  }

  .field input:focus {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .success {
    margin: 0;
    color: var(--success);
    background: var(--success-soft);
    padding: var(--space-3);
    border-radius: var(--r-md);
  }

  .error {
    margin: 0;
    color: var(--danger);
    background: var(--danger-soft);
    padding: var(--space-3);
    border-radius: var(--r-md);
  }

  .status-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2) var(--space-4);
    margin: 0;
  }

  .status-grid dt {
    color: var(--ink-2);
  }

  .status-grid dd {
    margin: 0;
    color: var(--ink-1);
  }

  .actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
    margin-top: var(--space-2);
  }

  code {
    background: var(--surface-hover);
    padding: 0 var(--space-1);
    border-radius: var(--r-sm);
    font-size: 0.95em;
  }

  /*
   * Laptop: the sheet becomes a fixed-width right side panel that slides
   * in from the edge; the backdrop and grabber drop away.
   */
  @container app (min-width: 820px) {
    .sheet {
      left: auto;
      right: 0;
      top: 0;
      bottom: 0;
      width: 380px;
      max-height: 100%;
      border-radius: 0;
      border-left: 1px solid var(--line-1);
      transform: translateX(100%);
      transition: transform var(--transition-pop);
    }

    .sheet.open {
      transform: translateX(0);
    }

    .sheet-backdrop {
      display: none;
    }

    .grabber {
      display: none;
    }
  }
</style>
