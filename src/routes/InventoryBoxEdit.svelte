<script lang="ts">
  /**
   * Inventory Box Edit
   *
   * Deep flow on a single box, redesigned for the 2026 UX refresh:
   *  - Stage header in place of the previous topbar: a back chevron
   *    leading "Inventory" and a stage title "Edit box". The persistent
   *    bottom tab bar / left rail stays mounted as the user's escape
   *    hatch.
   *  - Hero tile painted with the flavor tone (fill background, accent
   *    border, ink text) showing the flavor name and physical location.
   *  - Quantity stepper replaces the Add / Remove / Set modal trio:
   *    44x44 minus and plus buttons around a tabular readout, with the
   *    minus disabled at 0 and the plus disabled at 12.
   *  - Status segmented control replaces the toggle button.
   *  - Sticky Cancel / Save footer commits the local copy on Save and
   *    discards on Cancel.
   *  - Remove still requires confirmation; the auto-delete prompt that
   *    fired when removing the last bottle is dropped in favor of the
   *    explicit Remove button.
   *
   * Location editing has been removed entirely; the Rearrange screen on
   * the More tab is the canonical place to relocate boxes. The
   * displace/swap conflict-resolution modals went with it.
   *
   * @route /inventory/:boxId/edit
   * @component
   */

  import { push } from 'svelte-spa-router';
  import { appState, updateBoxQuantity, updateBoxIsOpen, removeBox } from '$lib/stores';
  import { maybeGetFlavor } from '$lib/utils/flavor';
  import { getFlavorTone } from '$lib/utils/flavor-color';
  import { ROUTES } from '$lib/router/routes';
  import Modal from '$lib/components/Modal.svelte';

  /**
   * Maximum bottles per box. Mirrors the value enforced by the Add
   * Inventory closed-box flow so the stepper doesn't overshoot.
   */
  const MAX_BOTTLES_PER_BOX = 12;

  // Route params (Svelte 5 syntax)
  const { params = {} }: { params?: Record<string, string> } = $props();

  /**
   * Box id resolved at every render so navigation across box-edit
   * URLs picks up the latest param without remounting.
   */
  const boxId = $derived(params.boxId ?? '');

  // Live source of truth from the store
  const box = $derived($appState.boxes.find((b) => b.id === boxId));
  const flavor = $derived(box ? maybeGetFlavor(box.flavorId, $appState.flavors) : null);
  const tone = $derived(flavor ? getFlavorTone(flavor.id) : null);

  /**
   * Working copy of the editable fields. Reset when the underlying box
   * changes (different boxId or external mutation) so the form always
   * reflects the latest store value before the user starts editing.
   */
  let quantity = $state<number>(0);
  let isOpen = $state<boolean>(false);

  /**
   * Has the user changed anything since the form last synced from the
   * store? Used to disable Save when nothing would change.
   */
  const isDirty = $derived(
    box !== undefined && (quantity !== box.quantity || isOpen !== box.isOpen)
  );

  /**
   * Sync the working copy from the store whenever the box id changes.
   * Watching box.id rather than box itself avoids resetting mid-edit if
   * an unrelated store mutation rebuilds the array reference.
   */
  $effect(() => {
    if (box) {
      quantity = box.quantity;
      isOpen = box.isOpen;
    }
  });

  let showDeleteConfirm = $state(false);

  function decrement() {
    if (quantity > 0) quantity -= 1;
  }

  function increment() {
    if (quantity < MAX_BOTTLES_PER_BOX) quantity += 1;
  }

  function handleSave() {
    if (!box) return;
    if (quantity !== box.quantity) {
      updateBoxQuantity(box.id, quantity);
    }
    if (isOpen !== box.isOpen) {
      updateBoxIsOpen(box.id, isOpen);
    }
    push(ROUTES.INVENTORY);
  }

  function handleCancel() {
    push(ROUTES.INVENTORY);
  }

  function handleRemove() {
    if (!box) return;
    removeBox(box.id);
    showDeleteConfirm = false;
    push(ROUTES.INVENTORY);
  }
</script>

{#if !box || !flavor || !tone}
  <section class="error-screen">
    <header class="stage-header">
      <button type="button" class="back-btn" onclick={() => push(ROUTES.INVENTORY)}>
        <span class="chevron" aria-hidden="true">‹</span> Inventory
      </button>
      <h1 class="stage-title">Edit box</h1>
    </header>
    <div class="empty">Box not found.</div>
  </section>
{:else}
  <section class="edit-screen" data-testid="box-edit-screen">
    <header class="stage-header">
      <button
        type="button"
        class="back-btn"
        onclick={() => push(ROUTES.INVENTORY)}
        data-testid="box-edit-back"
      >
        <span class="chevron" aria-hidden="true">‹</span> Inventory
      </button>
      <h1 class="stage-title">Edit box</h1>
    </header>

    <div class="edit-body">
      <div
        class="edit-hero"
        style="background: {tone.fill}; border-color: {tone.accent}; color: {tone.ink};"
        data-testid="box-edit-hero"
      >
        <span class="hero-flavor">{flavor.name}</span>
        <span class="hero-loc" style="color: {tone.accent};">
          Stack {box.location.stack} · Row {box.location.height}
        </span>
      </div>

      <div class="field">
        <span class="field-label" id="qty-label">Bottles remaining</span>
        <div class="qty-stepper" role="group" aria-labelledby="qty-label">
          <button
            type="button"
            onclick={decrement}
            disabled={quantity <= 0}
            aria-label="Decrease bottle count"
            data-testid="qty-minus"
          >
            −
          </button>
          <span class="qty-readout" data-testid="qty-readout">{quantity}</span>
          <button
            type="button"
            onclick={increment}
            disabled={quantity >= MAX_BOTTLES_PER_BOX}
            aria-label="Increase bottle count"
            data-testid="qty-plus"
          >
            +
          </button>
        </div>
        <p class="field-hint">A full closed box has 12 bottles.</p>
      </div>

      <div class="field">
        <span class="field-label">Status</span>
        <div class="seg" role="group" aria-label="Status">
          <button
            type="button"
            aria-pressed={!isOpen}
            onclick={() => (isOpen = false)}
            data-testid="status-sealed"
          >
            Sealed
          </button>
          <button
            type="button"
            aria-pressed={isOpen}
            onclick={() => (isOpen = true)}
            data-testid="status-open"
          >
            Open
          </button>
        </div>
      </div>

      <div class="danger-row">
        <button
          type="button"
          class="btn-danger"
          onclick={() => (showDeleteConfirm = true)}
          data-testid="remove-box-btn"
        >
          Remove box
        </button>
      </div>
    </div>

    <footer class="edit-foot">
      <button type="button" class="btn btn-ghost" onclick={handleCancel} data-testid="cancel-btn">
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        onclick={handleSave}
        disabled={!isDirty}
        data-testid="save-btn"
      >
        Save
      </button>
    </footer>
  </section>

  <Modal open={showDeleteConfirm} title="Remove box" onclose={() => (showDeleteConfirm = false)}>
    <div class="delete-confirm">
      <p>Remove this box of {flavor.name}?</p>
      <p class="warning">This action cannot be undone.</p>
      <div class="delete-actions">
        <button type="button" class="btn btn-ghost" onclick={() => (showDeleteConfirm = false)}>
          Cancel
        </button>
        <button
          type="button"
          class="btn-danger"
          onclick={handleRemove}
          data-testid="confirm-remove-btn"
        >
          Remove box
        </button>
      </div>
    </div>
  </Modal>
{/if}

<style>
  .edit-screen,
  .error-screen {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .stage-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 12px 8px;
    border-bottom: 1px solid var(--line-1);
  }

  .back-btn {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    font-family: inherit;
    font-size: 14px;
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    padding: 8px 10px 8px 6px;
    border-radius: var(--r-md);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .back-btn:hover {
    background: var(--surface-hover);
    color: var(--ink-1);
  }

  .back-btn .chevron {
    font-size: 18px;
    line-height: 1;
    margin-top: -1px;
  }

  .stage-title {
    font-size: 15px;
    font-weight: var(--font-weight-semibold);
    margin: 0;
    letter-spacing: -0.005em;
  }

  .edit-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 520px;
    width: 100%;
    margin: 0 auto;
    overflow-y: auto;
    flex: 1;
  }

  @container app (min-width: 820px) {
    .edit-body {
      padding: 32px;
      gap: 28px;
    }
  }

  .edit-hero {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 18px;
    border-radius: var(--r-md);
    border: 1px solid;
    position: relative;
  }

  .hero-flavor {
    font-size: 18px;
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.01em;
  }

  .hero-loc {
    font-size: 12px;
    font-family: var(--font-family-mono);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field-label {
    font-size: 12px;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--ink-3);
  }

  .field-hint {
    font-size: 12px;
    color: var(--ink-3);
    line-height: 1.5;
    margin: 0;
  }

  .qty-stepper {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--surface-sunk);
    border: 1px solid var(--line-1);
    border-radius: var(--r-md);
    padding: 4px;
    width: fit-content;
  }

  .qty-stepper button {
    appearance: none;
    border: 0;
    background: var(--surface-card);
    color: var(--ink-1);
    font-family: inherit;
    font-size: 22px;
    font-weight: var(--font-weight-medium);
    width: 44px;
    height: 44px;
    border-radius: 7px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-1);
  }

  .qty-stepper button:hover:not(:disabled) {
    background: var(--surface-hover);
  }

  .qty-stepper button:disabled {
    background: transparent;
    color: var(--ink-4);
    cursor: not-allowed;
    box-shadow: none;
  }

  .qty-readout {
    min-width: 64px;
    font-size: 24px;
    font-weight: var(--font-weight-semibold);
    font-variant-numeric: tabular-nums;
    text-align: center;
    padding: 0 6px;
  }

  .seg {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    background: var(--surface-sunk);
    padding: 3px;
    border-radius: var(--r-md);
    border: 1px solid var(--line-1);
  }

  .seg button {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    font-family: inherit;
    font-size: 13px;
    font-weight: var(--font-weight-medium);
    padding: 8px 10px;
    border-radius: 7px;
    cursor: pointer;
  }

  .seg button[aria-pressed='true'] {
    background: var(--surface-card);
    color: var(--ink-1);
    box-shadow: var(--shadow-1);
    font-weight: var(--font-weight-semibold);
  }

  .danger-row {
    margin-top: 10px;
    display: flex;
    justify-content: flex-start;
  }

  .btn-danger {
    appearance: none;
    background: transparent;
    color: var(--danger);
    border: 1px solid var(--danger);
    font-family: inherit;
    font-size: 14px;
    font-weight: var(--font-weight-medium);
    padding: 10px 16px;
    border-radius: var(--r-md);
    cursor: pointer;
  }

  .btn-danger:hover {
    background: var(--danger-soft);
  }

  .edit-foot {
    border-top: 1px solid var(--line-1);
    background: var(--surface-app);
    padding: 14px 20px;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .btn {
    appearance: none;
    border: 1px solid transparent;
    font-family: inherit;
    font-size: 14px;
    font-weight: var(--font-weight-medium);
    padding: 10px 16px;
    border-radius: var(--r-md);
    cursor: pointer;
    letter-spacing: -0.005em;
  }

  .btn-primary {
    background: var(--ink-1);
    color: var(--surface-card);
    font-weight: var(--font-weight-semibold);
  }

  .btn-primary:hover:not(:disabled) {
    background: oklch(0.3 0.01 80);
  }

  .btn-primary:disabled {
    background: var(--ink-4);
    cursor: not-allowed;
  }

  .btn-ghost {
    background: transparent;
    color: var(--ink-2);
  }

  .btn-ghost:hover {
    background: var(--surface-hover);
    color: var(--ink-1);
  }

  .delete-confirm {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .delete-confirm p {
    margin: 0;
    color: var(--ink-1);
  }

  .warning {
    color: var(--danger);
    font-weight: var(--font-weight-medium);
    font-size: 13px;
  }

  .delete-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    justify-content: flex-end;
  }

  .empty {
    padding: 40px;
    text-align: center;
    color: var(--ink-3);
  }
</style>
