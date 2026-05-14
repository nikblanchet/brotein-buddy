<script lang="ts">
  /**
   * Sign-in conflict resolution modal.
   *
   * Mounted globally and bound to `pendingConflict` from the sync
   * coordinator. When non-null, both the local device and the server have
   * non-trivial inventory; the user picks which side wins. The decision is
   * passed back to the coordinator via `resolveConflict`.
   *
   * @component
   */

  import Button from './Button.svelte';
  import Modal from './Modal.svelte';
  import { appState } from '$lib/stores';
  import { pendingConflict, resolveConflict } from '$lib/sync-coordinator';

  let choice = $state<'keep-local' | 'keep-server'>('keep-local');
  let busy = $state(false);

  let conflict = $derived($pendingConflict);
  let local = $derived($appState);

  let localBoxCount = $derived(local.boxes.length);
  let localOpenBoxes = $derived(local.boxes.filter((b) => b.isOpen).length);
  let localEventCount = $derived(local.events.length);

  let serverBoxCount = $derived(conflict?.boxCount ?? 0);
  let serverEventCount = $derived(conflict?.eventCount ?? 0);

  function formatServerUpdate(timestamp: string | null | undefined): string {
    if (!timestamp) return 'unknown';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'unknown';
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  async function handleContinue() {
    busy = true;
    try {
      await resolveConflict(choice);
    } finally {
      busy = false;
    }
  }

  async function handleCancel() {
    busy = true;
    try {
      await resolveConflict('cancel');
    } finally {
      busy = false;
    }
  }
</script>

<Modal open={conflict !== null} title="Resolve data conflict" onclose={handleCancel}>
  {#if conflict}
    <div class="conflict">
      <p class="explainer">
        Both this device and the server have inventory data. Pick which one to keep — the other will
        be replaced.
      </p>

      <div class="options" role="radiogroup" aria-label="Conflict resolution choice">
        <label class="option" class:selected={choice === 'keep-local'}>
          <input
            type="radio"
            name="conflict-choice"
            value="keep-local"
            bind:group={choice}
            disabled={busy}
            data-testid="conflict-modal-keep-local"
          />
          <div class="option-body">
            <strong>Keep this device</strong>
            <p>
              {localBoxCount} box{localBoxCount === 1 ? '' : 'es'}
              ({localOpenBoxes} open), {localEventCount} timeline event{localEventCount === 1
                ? ''
                : 's'}.
            </p>
          </div>
        </label>

        <label class="option" class:selected={choice === 'keep-server'}>
          <input
            type="radio"
            name="conflict-choice"
            value="keep-server"
            bind:group={choice}
            disabled={busy}
            data-testid="conflict-modal-keep-server"
          />
          <div class="option-body">
            <strong>Keep server</strong>
            <p>
              {serverBoxCount} box{serverBoxCount === 1 ? '' : 'es'}, {serverEventCount} timeline event{serverEventCount ===
              1
                ? ''
                : 's'}. Last change
              {formatServerUpdate(conflict.updatedAt)}.
            </p>
          </div>
        </label>
      </div>

      <div class="actions">
        <Button
          variant="ghost"
          size="base"
          onclick={handleCancel}
          disabled={busy}
          testId="conflict-modal-cancel"
        >
          Cancel sign-in
        </Button>
        <Button
          variant="primary"
          size="base"
          onclick={handleContinue}
          disabled={busy}
          testId="conflict-modal-continue"
        >
          {busy ? 'Working…' : 'Continue'}
        </Button>
      </div>
    </div>
  {/if}
</Modal>

<style>
  .conflict {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .explainer {
    margin: 0;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .option {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .option.selected {
    border-color: var(--color-primary);
    background: var(--color-background-secondary);
  }

  .option input {
    margin-top: 4px;
  }

  .option-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .option-body strong {
    color: var(--color-text-primary);
  }

  .option-body p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
  }
</style>
