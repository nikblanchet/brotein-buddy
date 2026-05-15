<script lang="ts">
  /**
   * More
   *
   * Lightweight catch-all screen that surfaces the project's secondary
   * functionality - Sync & sign-in, Backup & restore, Rearrange stacks,
   * and a placeholder Settings row - away from the primary Pick and
   * Inventory flows.
   */

  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
  import BackupRestoreModal from '$lib/components/BackupRestoreModal.svelte';
  import { syncSheetOpen } from '$lib/sync-ui-state';

  let backupOpen = $state(false);
</script>

<section class="more">
  <header class="more-header">
    <p class="eyebrow">App</p>
    <h1>More</h1>
  </header>

  <div class="more-list">
    <button type="button" class="more-row" onclick={() => (backupOpen = true)}>
      <span class="more-glyph" aria-hidden="true">↻</span>
      <span class="more-label">Backup &amp; restore</span>
      <span class="more-chevron" aria-hidden="true">›</span>
    </button>

    <button
      type="button"
      class="more-row"
      onclick={() => syncSheetOpen.set(true)}
      data-testid="more-sync-row"
    >
      <span class="more-glyph" aria-hidden="true">☁</span>
      <span class="more-label">Sync &amp; sign-in</span>
      <span class="more-chevron" aria-hidden="true">›</span>
    </button>

    <button type="button" class="more-row" onclick={() => push(ROUTES.INVENTORY_REARRANGE)}>
      <span class="more-glyph" aria-hidden="true">⇄</span>
      <span class="more-label">Rearrange stacks</span>
      <span class="more-chevron" aria-hidden="true">›</span>
    </button>

    <button type="button" class="more-row" disabled>
      <span class="more-glyph" aria-hidden="true">⚙</span>
      <span class="more-label">Settings</span>
      <span class="more-soon">soon</span>
    </button>
  </div>
</section>

<BackupRestoreModal open={backupOpen} onclose={() => (backupOpen = false)} />

<style>
  .more {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 24px 20px 32px;
    overflow-y: auto;
    height: 100%;
  }

  @container app (min-width: 820px) {
    .more {
      padding: 48px;
      max-width: 720px;
      margin: 0 auto;
      gap: 28px;
    }
  }

  .eyebrow {
    font-size: 14px;
    color: var(--ink-3);
    margin: 0;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .more-header h1 {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--ink-1);
    margin: 0;
  }

  @container app (min-width: 820px) {
    .more-header h1 {
      font-size: 36px;
    }
  }

  .more-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }

  .more-row {
    appearance: none;
    border: 1px solid var(--line-2);
    background: var(--surface-card);
    color: var(--ink-1);
    font-family: inherit;
    font-size: 15px;
    font-weight: 500;
    padding: 14px 18px;
    border-radius: var(--r-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    width: 100%;
  }

  .more-row:hover:not(:disabled) {
    background: var(--surface-hover);
  }

  .more-row:disabled {
    cursor: not-allowed;
    color: var(--ink-3);
  }

  .more-glyph {
    font-size: 16px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--surface-sunk);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .more-label {
    flex: 1;
  }

  .more-chevron {
    color: var(--ink-3);
  }

  .more-soon {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-3);
  }
</style>
