<script lang="ts">
  /**
   * Sync & Account modal.
   *
   * Two states, switched by the current Supabase session:
   *   - Signed out: email input + "Send magic link" button.
   *   - Signed in:  email display + last-synced timestamp + sign-out button.
   *
   * The modal does not own the sync state machine — it just observes the
   * stores from `lib/sync-coordinator` and the `session` store from
   * `lib/auth`. The coordinator handles push/pull and conflict resolution
   * on its own.
   *
   * @component
   */

  import Button from './Button.svelte';
  import Modal from './Modal.svelte';
  import { session, sendMagicLink, signOut, AuthError, SyncNotConfiguredError } from '$lib/auth';
  import { syncStatus, lastSyncedAt, lastError } from '$lib/sync-coordinator';
  import { isSyncConfigured } from '$lib/supabase';

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

  let email = $state('');
  let stage = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
  let errorMessage = $state('');

  $effect(() => {
    if (!open) {
      stage = 'idle';
      errorMessage = '';
    }
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

<Modal {open} title="Sync & Account" {onclose}>
  {#if !isSyncConfigured()}
    <div class="not-configured">
      <p>
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
        <Button variant="ghost" size="base" onclick={onclose}>Close</Button>
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
        <Button variant="ghost" size="base" onclick={onclose}>Close</Button>
      </div>
    </div>
  {/if}
</Modal>

<style>
  .signed-out,
  .signed-in,
  .not-configured {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-2) 0;
  }

  .explainer {
    margin: 0;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .field span {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .field input {
    padding: var(--space-3);
    font-size: var(--font-size-base);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    background: var(--color-background);
    color: var(--color-text-primary);
  }

  .field input:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }

  .success {
    margin: 0;
    color: var(--color-success-dark);
    background: var(--color-success-bg);
    padding: var(--space-3);
    border-radius: var(--radius-base);
  }

  .error {
    margin: 0;
    color: var(--color-danger-dark);
    background: var(--color-danger-bg);
    padding: var(--space-3);
    border-radius: var(--radius-base);
  }

  .status-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2) var(--space-4);
    margin: 0;
  }

  .status-grid dt {
    color: var(--color-text-secondary);
  }

  .status-grid dd {
    margin: 0;
    color: var(--color-text-primary);
  }

  .actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
    margin-top: var(--space-2);
  }

  code {
    background: var(--color-background-secondary);
    padding: 0 var(--space-1);
    border-radius: var(--radius-sm);
    font-size: 0.95em;
  }
</style>
