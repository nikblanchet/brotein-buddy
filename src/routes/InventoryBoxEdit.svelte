<script lang="ts">
  /**
   * Box Edit Screen
   *
   * Screen for editing individual box properties: quantity, location, open/closed status.
   * Supports adding/removing quantity, changing location with conflict resolution,
   * toggling open/closed status, and deleting boxes.
   *
   * @component
   */

  import { push } from 'svelte-spa-router';
  import {
    appState,
    updateBoxQuantity,
    updateBoxLocation,
    updateBoxIsOpen,
    removeBox,
  } from '$lib/stores';
  import { maybeGetFlavor } from '$lib/utils/flavor';
  import { getFlavorColor } from '$lib/utils/inventory-utils';
  import {
    validateLocationNoGaps,
    getLocationConflict,
    formatLocation,
  } from '$lib/utils/location-validation';
  import { ROUTES } from '$lib/router/routes';
  import Button from '$lib/components/Button.svelte';
  import NumberPad from '$lib/components/NumberPad.svelte';
  import Modal from '$lib/components/Modal.svelte';

  // Route params
  export let params: Record<string, string> = {};

  // Extract boxId from route params
  const boxId = params.boxId || '';

  // Modal states
  let showAddQuantityModal = $state(false);
  let showRemoveQuantityModal = $state(false);
  let showLocationModal = $state(false);
  let showDeleteConfirmModal = $state(false);
  let showConflictModal = $state(false);
  let showAutoDeleteModal = $state(false);

  // Location change state
  let newStack = $state<number | null>(null);
  let newHeight = $state<number | null>(null);
  let locationError = $state<string | null>(null);
  let conflictingBoxId = $state<string | null>(null);

  // Derived state
  const box = $derived($appState.boxes.find((b) => b.id === boxId));
  const flavor = $derived(box ? maybeGetFlavor(box.flavorId, $appState.flavors) : null);
  const boxColor = $derived(box && flavor ? getFlavorColor(flavor.id) : '#cccccc');

  // Handler: Add Quantity
  function handleAddQuantity(amount: number) {
    if (!box) return;

    const newQuantity = box.quantity + amount;
    if (newQuantity > 12) {
      alert('Quantity cannot exceed 12');
      return;
    }

    updateBoxQuantity(boxId, newQuantity);
    showAddQuantityModal = false;
  }

  // Handler: Remove Quantity
  function handleRemoveQuantity(amount: number) {
    if (!box) return;

    const newQuantity = box.quantity - amount;

    if (newQuantity < 0) {
      alert('Quantity cannot be negative');
      return;
    }

    if (newQuantity === 0) {
      // Auto-show delete prompt when quantity reaches 0
      updateBoxQuantity(boxId, 0);
      showRemoveQuantityModal = false;
      showAutoDeleteModal = true;
    } else {
      updateBoxQuantity(boxId, newQuantity);
      showRemoveQuantityModal = false;
    }
  }

  // Handler: Keep empty box (from auto-delete prompt)
  function handleKeepEmptyBox() {
    showAutoDeleteModal = false;
  }

  // Handler: Delete box (from auto-delete or manual delete)
  function handleDeleteBox() {
    removeBox(boxId);
    showAutoDeleteModal = false;
    showDeleteConfirmModal = false;
    push(ROUTES.INVENTORY);
  }

  // Handler: Start location change
  function handleOpenLocationModal() {
    if (!box) return;
    newStack = box.location.stack;
    newHeight = box.location.height;
    locationError = null;
    showLocationModal = true;
  }

  // Handler: Confirm location change
  function handleConfirmLocationChange() {
    if (!box || newStack === null || newHeight === null) return;

    // Validate location (no gaps)
    const validation = validateLocationNoGaps(newStack, newHeight, $appState.boxes, boxId);
    if (!validation.isValid) {
      locationError = validation.error || 'Invalid location';
      return;
    }

    // Check for conflicts
    const conflict = getLocationConflict(newStack, newHeight, $appState.boxes, boxId);
    if (conflict) {
      conflictingBoxId = conflict.id;
      showLocationModal = false;
      showConflictModal = true;
      return;
    }

    // No conflict, update location
    updateBoxLocation(boxId, { stack: newStack, height: newHeight });
    showLocationModal = false;
  }

  // Handler: Swap locations (conflict resolution)
  function handleSwapLocations() {
    if (!box || !conflictingBoxId || newStack === null || newHeight === null) return;

    const conflictingBox = $appState.boxes.find((b) => b.id === conflictingBoxId);
    if (!conflictingBox) return;

    // Swap: move conflicting box to current box's location, then move current box
    updateBoxLocation(conflictingBoxId, { ...box.location });
    updateBoxLocation(boxId, { stack: newStack, height: newHeight });

    showConflictModal = false;
    conflictingBoxId = null;
  }

  // Handler: Displace box (conflict resolution)
  function handleDisplaceBox() {
    if (!box || !conflictingBoxId || newStack === null || newHeight === null) return;

    // Displace: remove conflicting box's location (orphan it), then move current box
    updateBoxLocation(conflictingBoxId, { stack: 0, height: 0 }); // Orphaned state
    updateBoxLocation(boxId, { stack: newStack, height: newHeight });

    showConflictModal = false;
    conflictingBoxId = null;
  }

  // Handler: Toggle open/closed
  function handleToggleOpenClosed() {
    if (!box) return;
    updateBoxIsOpen(boxId, !box.isOpen);
  }
</script>

{#if !box}
  <div class="error-screen">
    <h1>Box Not Found</h1>
    <p>The box you are looking for does not exist.</p>
    <Button variant="secondary" onclick={() => push(ROUTES.INVENTORY)}>Back to Inventory</Button>
  </div>
{:else if !flavor}
  <div class="error-screen">
    <h1>Flavor Not Found</h1>
    <p>This box's flavor information is missing.</p>
    <Button variant="secondary" onclick={() => push(ROUTES.INVENTORY)}>Back to Inventory</Button>
  </div>
{:else}
  <div class="box-edit-screen">
    <!-- Header -->
    <header class="header">
      <Button variant="ghost" size="small" onclick={() => push(ROUTES.INVENTORY)}>← Back</Button>
      <h1>Edit Box</h1>
    </header>

    <!-- Visual Box Representation -->
    <div class="box-visual-container">
      <div class="box-visual" style="background-color: {boxColor}">
        <div class="box-label">{flavor.name}</div>
      </div>
    </div>

    <!-- Box Details -->
    <div class="box-details">
      <div class="detail-item">
        <span class="label">Quantity:</span>
        <span class="value">{box.quantity}</span>
      </div>
      <div class="detail-item">
        <span class="label">Location:</span>
        <span class="value">{formatLocation(box.location.stack, box.location.height)}</span>
      </div>
      <div class="detail-item">
        <span class="label">Status:</span>
        <span class="value status-badge" class:open={box.isOpen} class:closed={!box.isOpen}>
          {box.isOpen ? 'Open' : 'Closed'}
        </span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="actions">
      <Button variant="primary" onclick={() => (showAddQuantityModal = true)}>Add Quantity</Button>

      <Button variant="primary" onclick={() => (showRemoveQuantityModal = true)}>
        Remove Quantity
      </Button>

      <Button variant="secondary" onclick={handleOpenLocationModal}>Change Location</Button>

      <Button variant="secondary" onclick={handleToggleOpenClosed}>
        Toggle {box.isOpen ? 'Closed' : 'Open'}
      </Button>

      <Button variant="danger" onclick={() => (showDeleteConfirmModal = true)}>Delete Box</Button>
    </div>
  </div>

  <!-- Add Quantity Modal -->
  <Modal bind:isOpen={showAddQuantityModal} title="Add Quantity">
    <NumberPad
      max={12}
      onConfirm={handleAddQuantity}
      onCancel={() => (showAddQuantityModal = false)}
    />
  </Modal>

  <!-- Remove Quantity Modal -->
  <Modal bind:isOpen={showRemoveQuantityModal} title="Remove Quantity">
    <NumberPad
      max={box.quantity}
      onConfirm={handleRemoveQuantity}
      onCancel={() => (showRemoveQuantityModal = false)}
    />
  </Modal>

  <!-- Change Location Modal -->
  <Modal bind:isOpen={showLocationModal} title="Change Location">
    <div class="location-form">
      <div class="form-group">
        <label for="stack">Stack (Column):</label>
        <input
          id="stack"
          type="number"
          min="1"
          bind:value={newStack}
          placeholder="Enter stack number"
        />
      </div>

      <div class="form-group">
        <label for="height">Height (Row):</label>
        <input
          id="height"
          type="number"
          min="1"
          bind:value={newHeight}
          placeholder="Enter height number"
        />
      </div>

      {#if locationError}
        <p class="error-message">{locationError}</p>
      {/if}

      <div class="modal-actions">
        <Button variant="secondary" onclick={() => (showLocationModal = false)}>Cancel</Button>
        <Button variant="primary" onclick={handleConfirmLocationChange}>Confirm</Button>
      </div>
    </div>
  </Modal>

  <!-- Location Conflict Modal -->
  <Modal bind:isOpen={showConflictModal} title="Location Conflict">
    {#if newStack !== null && newHeight !== null}
      <div class="conflict-content">
        <p class="conflict-message">
          Location {formatLocation(newStack, newHeight)} is occupied by another box.
        </p>
        <p class="conflict-question">How would you like to resolve this?</p>

        <div class="conflict-actions">
          <Button variant="primary" onclick={handleSwapLocations}>Swap Locations</Button>
          <Button variant="warning" onclick={handleDisplaceBox}>Displace Box</Button>
          <Button variant="secondary" onclick={() => (showConflictModal = false)}>Cancel</Button>
        </div>
      </div>
    {/if}
  </Modal>

  <!-- Auto-Delete Prompt Modal (when quantity reaches 0) -->
  <Modal bind:isOpen={showAutoDeleteModal} title="Box Empty">
    <div class="delete-prompt">
      <p>
        This box now has 0 quantity. Would you like to delete it or keep it for future inventory?
      </p>

      <div class="delete-actions">
        <Button variant="secondary" onclick={handleKeepEmptyBox}>Keep Empty Box</Button>
        <Button variant="danger" onclick={handleDeleteBox}>Delete Box</Button>
      </div>
    </div>
  </Modal>

  <!-- Manual Delete Confirmation Modal -->
  <Modal bind:isOpen={showDeleteConfirmModal} title="Delete Box">
    <div class="delete-confirm">
      <p>Delete this box of {flavor.name}?</p>
      <p class="warning">This action cannot be undone.</p>

      <div class="delete-actions">
        <Button variant="secondary" onclick={() => (showDeleteConfirmModal = false)}>Cancel</Button>
        <Button variant="danger" onclick={handleDeleteBox}>Delete Box</Button>
      </div>
    </div>
  </Modal>
{/if}

<style>
  .box-edit-screen {
    min-height: 100vh;
    padding: var(--space-4);
    max-width: 600px;
    margin: 0 auto;
  }

  .error-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--space-6);
    text-align: center;
    gap: var(--space-4);
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  .header h1 {
    font-size: var(--font-size-xl);
    color: var(--color-text-primary);
    margin: 0;
  }

  .box-visual-container {
    display: flex;
    justify-content: center;
    margin-bottom: var(--space-6);
  }

  .box-visual {
    width: 150px;
    height: 150px;
    border-radius: var(--border-radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
    border: 3px solid rgba(0, 0, 0, 0.1);
  }

  .box-label {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: rgba(0, 0, 0, 0.7);
    text-align: center;
    padding: var(--space-2);
  }

  .box-details {
    background: var(--color-background-secondary);
    border-radius: var(--border-radius-md);
    padding: var(--space-4);
    margin-bottom: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .value {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .status-badge {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-sm);
  }

  .status-badge.open {
    background-color: var(--color-success-light);
    color: var(--color-success-dark);
  }

  .status-badge.closed {
    background-color: var(--color-neutral-light);
    color: var(--color-neutral-dark);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  /* Location Form Styles */
  .location-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-group label {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .form-group input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-base);
  }

  .error-message {
    color: var(--color-danger);
    font-size: var(--font-size-sm);
    margin: 0;
  }

  .modal-actions,
  .conflict-actions,
  .delete-actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }

  .conflict-actions {
    flex-direction: column;
  }

  .conflict-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .conflict-message {
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
    margin: 0;
  }

  .conflict-question {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .delete-prompt,
  .delete-confirm {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .delete-prompt p,
  .delete-confirm p {
    margin: 0;
    color: var(--color-text-primary);
  }

  .warning {
    color: var(--color-danger);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
  }

  @media (min-width: 768px) {
    .modal-actions,
    .delete-actions {
      justify-content: flex-end;
    }
  }
</style>
