<script lang="ts">
  /**
   * Backup & Restore Modal
   *
   * Two operations in one dialog:
   * - Export: serialize the current app state to a JSON file and trigger
   *   a browser download
   * - Restore: read a previously-exported JSON file, validate it, then
   *   replace the in-memory state (which auto-persists)
   *
   * The restore flow uses a two-step confirmation because it is destructive:
   * the user picks a file, sees a preview of what it contains, and must
   * explicitly click "Replace data" to overwrite their current inventory.
   *
   * @component
   */

  import { get } from 'svelte/store';
  import Button from './Button.svelte';
  import Modal from './Modal.svelte';
  import { appState, replaceAppState } from '$lib/stores';
  import {
    exportStateAsJson,
    parseBackupJson,
    buildBackupFilename,
    BackupError,
  } from '$lib/backup';
  import type { AppState } from '../../types/models';

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

  let fileInput = $state<HTMLInputElement | null>(null);
  let importStage = $state<'idle' | 'preview' | 'error'>('idle');
  let pendingImport = $state<AppState | null>(null);
  let pendingFilename = $state<string>('');
  let errorMessage = $state<string>('');

  $effect(() => {
    if (!open) {
      resetImport();
    }
  });

  function resetImport() {
    importStage = 'idle';
    pendingImport = null;
    pendingFilename = '';
    errorMessage = '';
    if (fileInput) {
      fileInput.value = '';
    }
  }

  function downloadBackup() {
    const json = exportStateAsJson(get(appState));
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildBackupFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleFileSelected(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    pendingFilename = file.name;

    try {
      const text = await file.text();
      const parsed = parseBackupJson(text);
      pendingImport = parsed;
      importStage = 'preview';
      errorMessage = '';
    } catch (err) {
      pendingImport = null;
      importStage = 'error';
      errorMessage =
        err instanceof BackupError
          ? err.message
          : 'Could not read the backup file. Please try a different file.';
    }
  }

  function confirmRestore() {
    if (!pendingImport) {
      return;
    }
    replaceAppState(pendingImport);
    resetImport();
    onclose();
  }

  function cancelRestore() {
    resetImport();
  }

  function triggerFilePicker() {
    fileInput?.click();
  }
</script>

<Modal {open} title="Backup & Restore" {onclose} size="sm">
  <div class="backup-modal">
    <!-- Export section -->
    <section class="backup-section">
      <h3>Download backup</h3>
      <p class="hint">Saves a JSON file of all your flavors, boxes, and settings to your device.</p>
      <Button
        variant="primary"
        size="base"
        fullWidth
        onclick={downloadBackup}
        testId="backup-modal-export"
      >
        Download backup
      </Button>
    </section>

    <hr class="divider" />

    <!-- Restore section -->
    <section class="backup-section">
      <h3>Restore from backup</h3>

      {#if importStage === 'idle'}
        <p class="hint">Pick a previously downloaded backup file to load it.</p>
        <input
          bind:this={fileInput}
          type="file"
          accept="application/json,.json"
          onchange={handleFileSelected}
          class="visually-hidden"
          aria-label="Choose backup file (.json)"
          data-testid="backup-modal-file-input"
        />
        <Button
          variant="secondary"
          size="base"
          fullWidth
          onclick={triggerFilePicker}
          ariaLabel="Choose backup file to restore"
          testId="backup-modal-choose-file"
        >
          Choose file…
        </Button>
      {:else if importStage === 'preview' && pendingImport}
        <div class="preview" data-testid="backup-modal-preview">
          <p class="preview-filename">{pendingFilename}</p>
          <ul class="preview-stats">
            <li>{pendingImport.flavors.length} flavors</li>
            <li>{pendingImport.boxes.length} boxes</li>
            <li>
              {pendingImport.favoriteFlavorId === null ? 'No favorite flavor' : '1 favorite flavor'}
            </li>
          </ul>
          <p class="warning">
            Replacing will overwrite all current data. Consider downloading a backup first.
          </p>
        </div>
      {:else if importStage === 'error'}
        <p class="error" data-testid="backup-modal-error">{errorMessage}</p>
        <Button
          variant="secondary"
          size="base"
          fullWidth
          onclick={resetImport}
          testId="backup-modal-error-retry"
        >
          Try another file
        </Button>
      {/if}
    </section>
  </div>

  {#snippet footer()}
    {#if importStage === 'preview'}
      <Button variant="ghost" onclick={cancelRestore} testId="backup-modal-restore-cancel">
        Cancel
      </Button>
      <Button variant="primary" onclick={confirmRestore} testId="backup-modal-restore-confirm">
        Replace data
      </Button>
    {:else}
      <Button variant="ghost" onclick={onclose} testId="backup-modal-close">Close</Button>
    {/if}
  {/snippet}
</Modal>

<style>
  .backup-modal {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .backup-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .backup-section h3 {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .hint {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .divider {
    border: none;
    border-top: 1px solid var(--color-border-light);
    margin: 0;
  }

  .preview {
    background-color: var(--color-surface-200);
    padding: var(--space-4);
    border-radius: var(--radius-base);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .preview-filename {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    word-break: break-all;
  }

  .preview-stats {
    margin: 0;
    padding-left: var(--space-5);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .warning {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
  }

  .error {
    margin: 0;
    padding: var(--space-3);
    background-color: var(--color-surface-200);
    border-left: 4px solid var(--color-danger, #c0392b);
    border-radius: var(--radius-base);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
