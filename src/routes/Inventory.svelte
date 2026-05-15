<script lang="ts">
  /**
   * Inventory
   *
   * Restructured for the 2026 UX refresh:
   *  - Stacks split into Active (any box is open) and Storage (sealed
   *    only) sections, each rendered in a 3-per-row grid that bottom-
   *    aligns so taller stacks rise higher within their row - matching
   *    the user's physical "buildings on a shelf" mental model.
   *  - Square BoxCard tiles paint with the curated flavor tone (fill +
   *    accent strip + ink text) and shrink their typography via
   *    container queries so the 3-col grid stays readable on phone.
   *  - Tally + filter chips at top; floating Add Inventory FAB at the
   *    bottom so the primary CTA is one thumb away.
   *  - Add Inventory is no longer a per-route modal - this screen just
   *    flips the addInventoryOpen store and the panel mounts at the
   *    App level.
   *  - The legacy table view, view-mode toggle, and Rearrange button
   *    are gone (Rearrange lives on the More tab now).
   *
   * The New Flavor and Backup & Restore modals are kept here as small
   * secondary actions for now; backup will move to the More screen in
   * a later commit and the New Flavor entry stays as a quiet link.
   *
   * @component
   */

  import Button from '$lib/components/Button.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import BoxCard from '$lib/components/BoxCard.svelte';
  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
  import { appState, addFlavor } from '$lib/stores';
  import type { Flavor, RandomPool } from '../types/models';
  import { groupBoxesByStack, getOutOfStockFlavors } from '$lib/inventory-utils';
  import { getFlavorTone } from '$lib/utils/flavor-color';
  import { generateFlavorId } from '$lib/utils/id';
  import { addInventoryOpen } from '$lib/panel-state';

  /**
   * Filter chip selection. Drives which flavors' boxes are shown.
   */
  let filter = $state<'all' | 'caff' | 'decaf'>('all');

  /**
   * New Flavor modal state. The redesign doesn't surface flavor
   * creation prominently but the capability stays so the user isn't
   * stranded with the flavors they have.
   */
  let isNewFlavorModalOpen = $state(false);
  let newFlavorName = $state('');
  let newFlavorRandomPool = $state<string>('caffeine-free');

  const flavorMap = $derived(new Map<string, Flavor>($appState.flavors.map((f) => [f.id, f])));

  /**
   * Boxes filtered by the active chip, paired with their flavor.
   */
  const filteredBoxes = $derived(
    $appState.boxes
      .filter((box) => {
        if (filter === 'all') return true;
        const flavor = flavorMap.get(box.flavorId);
        if (!flavor || !flavor.randomPool) return false;
        if (filter === 'caff') return flavor.randomPool === 'caffeinated';
        return flavor.randomPool === 'caffeine-free';
      })
      .map((box) => ({ box, flavor: flavorMap.get(box.flavorId) ?? null }))
  );

  /**
   * Stacks grouped from filtered boxes.
   */
  const boxesByStack = $derived(groupBoxesByStack(filteredBoxes));

  /**
   * Partition stacks into Active (any open box) vs Storage (sealed
   * only) so the user sees what they're using right now at the top.
   */
  const partitionedStacks = $derived.by(() => {
    const active: Array<[number, typeof filteredBoxes]> = [];
    const storage: Array<[number, typeof filteredBoxes]> = [];
    for (const [stackNum, list] of boxesByStack) {
      const isActive = list.some((entry) => entry.box.isOpen);
      (isActive ? active : storage).push([stackNum, list]);
    }
    return { active, storage };
  });

  /**
   * Flavors with zero stock across all (unfiltered) boxes - rendered
   * as a small "out of stock" pill row regardless of the active chip
   * so the user knows what to restock.
   */
  const outOfStockFlavors = $derived(getOutOfStockFlavors($appState.flavors, $appState.boxes));

  /**
   * Tally numbers for the header. Counted on the filtered set so the
   * numbers match what's visible.
   */
  const tally = $derived.by(() => {
    let bottles = 0;
    for (const { box } of filteredBoxes) {
      bottles += box.quantity;
    }
    return { boxes: filteredBoxes.length, bottles };
  });

  function handleBoxClick(boxId: string) {
    push(ROUTES.INVENTORY_BOX_EDIT(boxId));
  }

  function handleNewFlavorClick() {
    newFlavorName = '';
    newFlavorRandomPool = 'caffeine-free';
    isNewFlavorModalOpen = true;
  }

  function closeNewFlavorModal() {
    isNewFlavorModalOpen = false;
    newFlavorName = '';
    newFlavorRandomPool = 'caffeine-free';
  }

  function handleSaveNewFlavor() {
    const trimmed = newFlavorName.trim();
    if (trimmed === '') return;
    addFlavor({
      id: generateFlavorId(),
      name: trimmed,
      randomPool: (newFlavorRandomPool === 'none'
        ? null
        : newFlavorRandomPool) as RandomPool | null,
    });
    closeNewFlavorModal();
  }
</script>

<section class="inventory" data-testid="inventory-screen">
  <h1 class="sr-only">Inventory</h1>
  <div class="inv-tally" data-testid="inv-tally">
    <span class="big">{tally.boxes}</span>
    <span class="label">boxes</span>
    <span class="big" style="margin-left: 4px;">{tally.bottles}</span>
    <span class="label">bottles</span>
  </div>

  <div class="chip-row">
    <div class="chips" role="group" aria-label="Filter inventory by pool">
      <button
        type="button"
        class="chip"
        aria-pressed={filter === 'all'}
        onclick={() => (filter = 'all')}
        data-testid="chip-all"
      >
        All
      </button>
      <button
        type="button"
        class="chip"
        aria-pressed={filter === 'caff'}
        onclick={() => (filter = 'caff')}
        data-testid="chip-caff"
      >
        <span aria-hidden="true">⚡</span> Caffeinated
      </button>
      <button
        type="button"
        class="chip"
        aria-pressed={filter === 'decaf'}
        onclick={() => (filter = 'decaf')}
        data-testid="chip-decaf"
      >
        <span aria-hidden="true">💪</span> Decaf
      </button>
    </div>
    <button
      type="button"
      class="new-flavor-link"
      onclick={handleNewFlavorClick}
      data-testid="new-flavor-link"
    >
      + Add new flavor
    </button>
  </div>

  {#if filteredBoxes.length === 0}
    <div class="empty">No boxes match this filter.</div>
  {/if}

  {#if partitionedStacks.active.length > 0}
    <section class="stack-section" data-testid="active-section">
      <header class="stack-section-head">
        <span class="sect-name">
          <span class="dot" aria-hidden="true"></span>
          Active
        </span>
        <span class="sect-meta">
          {partitionedStacks.active.length} stack{partitionedStacks.active.length === 1 ? '' : 's'}
          · in use
        </span>
      </header>
      <div class="stack-group">
        {#each partitionedStacks.active as [stackNum, list] (stackNum)}
          {@const total = list.reduce((s, { box }) => s + box.quantity, 0)}
          <div class="stack" data-testid="stack-{stackNum}">
            <div class="stack-boxes">
              {#each list as { box, flavor } (box.id)}
                <BoxCard {box} {flavor} onclick={() => handleBoxClick(box.id)} />
              {/each}
            </div>
            <div class="stack-header">
              <span class="stack-num">S{stackNum}</span>
              <span class="stack-total">{total} btl</span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if partitionedStacks.storage.length > 0}
    <section class="stack-section" data-testid="storage-section">
      <header class="stack-section-head">
        <span class="sect-name storage">
          <span class="dot" aria-hidden="true"></span>
          Storage
        </span>
        <span class="sect-meta">
          {partitionedStacks.storage.length} stack{partitionedStacks.storage.length === 1
            ? ''
            : 's'} · sealed
        </span>
      </header>
      <div class="stack-group">
        {#each partitionedStacks.storage as [stackNum, list] (stackNum)}
          {@const total = list.reduce((s, { box }) => s + box.quantity, 0)}
          <div class="stack" data-testid="stack-{stackNum}">
            <div class="stack-boxes">
              {#each list as { box, flavor } (box.id)}
                <BoxCard {box} {flavor} onclick={() => handleBoxClick(box.id)} />
              {/each}
            </div>
            <div class="stack-header">
              <span class="stack-num">S{stackNum}</span>
              <span class="stack-total">{total} btl</span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if outOfStockFlavors.length > 0}
    <section class="oos-section" data-testid="oos-section">
      <header class="stack-section-head">
        <span class="sect-name storage">
          <span class="dot" aria-hidden="true"></span>
          Out of stock
        </span>
        <span class="sect-meta">
          {outOfStockFlavors.length} flavor{outOfStockFlavors.length === 1 ? '' : 's'}
        </span>
      </header>
      <div class="oos-list">
        {#each outOfStockFlavors as flavor (flavor.id)}
          {@const tone = getFlavorTone(flavor.id)}
          <span class="oos-pill" style="--dot: {tone.accent};">
            <span class="dot" aria-hidden="true"></span>
            {flavor.name}
          </span>
        {/each}
      </div>
    </section>
  {/if}

  <div class="fab-wrap">
    <button
      type="button"
      class="fab"
      onclick={() => addInventoryOpen.set(true)}
      data-testid="add-inventory-fab"
    >
      <span class="plus" aria-hidden="true">+</span> Add inventory
    </button>
  </div>
</section>

<Modal open={isNewFlavorModalOpen} title="Add new flavor" onclose={closeNewFlavorModal} size="sm">
  <div class="new-flavor-form">
    <div class="form-group">
      <label for="new-flavor-name">Name</label>
      <input
        id="new-flavor-name"
        type="text"
        bind:value={newFlavorName}
        placeholder="e.g. Salted Caramel"
        data-testid="new-flavor-name"
      />
    </div>

    <div class="form-group">
      <label for="new-flavor-pool">Random pool</label>
      <select id="new-flavor-pool" bind:value={newFlavorRandomPool}>
        <option value="caffeinated">Caffeinated</option>
        <option value="caffeine-free">Caffeine-free</option>
        <option value="none">Not in any pool</option>
      </select>
    </div>
  </div>
  <div class="modal-actions">
    <Button variant="ghost" onclick={closeNewFlavorModal}>Cancel</Button>
    <Button variant="primary" onclick={handleSaveNewFlavor} disabled={newFlavorName.trim() === ''}>
      Add flavor
    </Button>
  </div>
</Modal>

<style>
  .inventory {
    overflow-y: auto;
    padding: 18px 18px 96px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    height: 100%;
    box-sizing: border-box;
    position: relative;
  }

  @container app (min-width: 820px) {
    .inventory {
      padding: 28px 32px 32px;
      gap: 24px;
    }
  }

  .inv-tally {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: -4px 0;
  }

  .inv-tally .big {
    font-size: 22px;
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.02em;
    color: var(--ink-1);
    font-variant-numeric: tabular-nums;
  }

  .inv-tally .label {
    font-size: 13px;
    color: var(--ink-2);
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .chip {
    appearance: none;
    border: 1px solid var(--line-2);
    background: var(--surface-card);
    color: var(--ink-2);
    font-family: inherit;
    font-size: 13px;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
    font-weight: var(--font-weight-medium);
  }

  .chip[aria-pressed='true'] {
    background: var(--ink-1);
    color: var(--surface-card);
    border-color: var(--ink-1);
  }

  .chip:hover:not([aria-pressed='true']) {
    background: var(--surface-hover);
  }

  .new-flavor-link {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: var(--line-2);
    text-underline-offset: 4px;
  }

  .new-flavor-link:hover {
    color: var(--ink-1);
  }

  .empty {
    text-align: center;
    padding: 40px 20px;
    color: var(--ink-2);
  }

  .stack-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .stack-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0 2px;
  }

  .sect-name {
    font-size: 13px;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-2);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sect-name .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
  }

  .sect-name.storage .dot {
    background: var(--ink-4);
  }

  .sect-meta {
    font-size: 11px;
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
  }

  .stack-group {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    align-items: end;
  }

  @container app (min-width: 820px) {
    .stack-group {
      gap: 18px;
    }
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  @container app (min-width: 820px) {
    .stack {
      gap: 8px;
    }
  }

  .stack-boxes {
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
  }

  .stack-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 6px 2px;
    border-top: 1px solid var(--line-1);
    margin-top: 4px;
  }

  .stack-num {
    font-family: var(--font-family-mono);
    font-size: 11px;
    color: var(--ink-3);
    letter-spacing: 0.04em;
  }

  .stack-total {
    font-size: 11px;
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
  }

  .oos-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .oos-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .oos-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 6px 8px;
    background: var(--surface-card);
    border: 1px solid var(--line-2);
    border-radius: 999px;
    font-size: 13px;
    color: var(--ink-2);
  }

  .oos-pill .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--dot, var(--ink-3));
    opacity: 0.55;
  }

  .fab-wrap {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 16px 20px 24px;
    background: linear-gradient(to top, var(--surface-app) 50%, transparent);
    pointer-events: none;
    display: flex;
    justify-content: center;
    z-index: 3;
  }

  .fab {
    pointer-events: auto;
    appearance: none;
    border: 0;
    background: var(--ink-1);
    color: var(--surface-card);
    font-family: inherit;
    font-size: 15px;
    font-weight: var(--font-weight-semibold);
    padding: 14px 22px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: var(--shadow-2);
    letter-spacing: -0.005em;
  }

  .fab:hover {
    background: oklch(0.3 0.01 80);
  }

  .fab .plus {
    font-size: 18px;
    line-height: 1;
    margin-top: -1px;
  }

  /**
   * Hide the FAB on laptop. The topbar's "+ Add inventory" button is
   * the wide-layout entry point - mounting the FAB there too would
   * give the user two equally-prominent triggers in opposite corners.
   */
  @container app (min-width: 820px) {
    .fab-wrap {
      display: none;
    }
  }

  .new-flavor-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-weight: var(--font-weight-medium);
    color: var(--ink-1);
    font-size: 14px;
  }

  .form-group input,
  .form-group select {
    padding: 8px 12px;
    border: 1px solid var(--line-1);
    border-radius: var(--r-sm);
    font-size: 16px;
    background: var(--surface-card);
    color: var(--ink-1);
    font-family: inherit;
  }

  .modal-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    justify-content: flex-end;
  }
</style>
