<script lang="ts">
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import NumberPad from './NumberPad.svelte';
  import { addBox } from '$lib/stores';
  import {
    buildClosedBoxes,
    buildOpenBox,
    validateAddInventoryInput,
  } from '$lib/utils/add-inventory-utils';
  import {
    getLocationConflict,
    formatLocation,
    suggestNextLocation,
  } from '$lib/utils/location-validation';
  import type { Box, Flavor } from '../../types/models';

  interface Props {
    open: boolean;
    onclose: () => void;
    existingBoxes: Box[];
    flavors: Flavor[];
  }

  const { open, onclose, existingBoxes, flavors }: Props = $props();

  type Step = 'mode-select' | 'closed-detail' | 'open-detail';

  let step = $state<Step>('mode-select');
  let selectedFlavorId = $state('');
  let closedBoxCount = $state<number | null>(null);
  let openBoxQuantity = $state<number | null>(null);
  let showLocationOverride = $state(false);
  let overrideStack = $state<number | null>(null);
  let overrideHeight = $state<number | null>(null);
  let locationError = $state<string | null>(null);
  let validationError = $state<string | null>(null);

  // Reset all state when modal closes
  $effect(() => {
    if (!open) {
      step = 'mode-select';
      selectedFlavorId = '';
      closedBoxCount = null;
      openBoxQuantity = null;
      showLocationOverride = false;
      overrideStack = null;
      overrideHeight = null;
      locationError = null;
      validationError = null;
    }
  });

  // Pre-select first flavor when entering a detail step
  $effect(() => {
    if (
      (step === 'closed-detail' || step === 'open-detail') &&
      !selectedFlavorId &&
      flavors.length > 0
    ) {
      selectedFlavorId = flavors[0].id;
    }
  });

  // Suggested location for the first new box
  const suggestedLocation = $derived(suggestNextLocation(existingBoxes));

  function handleSelectMode(mode: 'closed' | 'open') {
    step = mode === 'closed' ? 'closed-detail' : 'open-detail';
    validationError = null;
  }

  function handleBack() {
    step = 'mode-select';
    closedBoxCount = null;
    openBoxQuantity = null;
    showLocationOverride = false;
    overrideStack = null;
    overrideHeight = null;
    locationError = null;
    validationError = null;
  }

  function handleCountSelect(value: number | 'keyboard') {
    if (value === 'keyboard') return;
    closedBoxCount = value;
    validationError = null;
  }

  function handleQuantitySelect(value: number | 'keyboard') {
    if (value === 'keyboard') return;
    openBoxQuantity = value;
    validationError = null;
  }

  function handleToggleLocationOverride() {
    showLocationOverride = !showLocationOverride;
    if (!showLocationOverride) {
      overrideStack = null;
      overrideHeight = null;
      locationError = null;
    }
  }

  function handleConfirm() {
    const mode = step === 'closed-detail' ? 'closed' : 'open';
    const error = validateAddInventoryInput(
      mode,
      selectedFlavorId,
      closedBoxCount,
      openBoxQuantity,
      flavors
    );

    if (error) {
      validationError = error;
      return;
    }

    // Validate location override if specified
    if (showLocationOverride && overrideStack !== null && overrideHeight !== null) {
      const conflict = getLocationConflict(overrideStack, overrideHeight, existingBoxes);
      if (conflict) {
        locationError = `Location ${formatLocation(overrideStack, overrideHeight)} is already occupied.`;
        return;
      }
      if (
        overrideStack < 1 ||
        overrideHeight < 1 ||
        !Number.isInteger(overrideStack) ||
        !Number.isInteger(overrideHeight)
      ) {
        locationError = 'Stack and height must be positive integers.';
        return;
      }
    }

    locationError = null;

    if (mode === 'closed') {
      const boxes = buildClosedBoxes(selectedFlavorId, closedBoxCount!, existingBoxes);

      // Apply location override to first box if specified
      if (showLocationOverride && overrideStack !== null && overrideHeight !== null) {
        boxes[0] = { ...boxes[0], location: { stack: overrideStack, height: overrideHeight } };
        // Re-sequence remaining boxes using accumulated locations
        const accumulated = [...existingBoxes, boxes[0]];
        for (let i = 1; i < boxes.length; i++) {
          const location = { ...boxes[i].location }; // already computed from buildClosedBoxes
          boxes[i] = { ...boxes[i], location };
          accumulated.push(boxes[i]);
        }
      }

      for (const box of boxes) {
        addBox(box);
      }
    } else {
      let box = buildOpenBox(selectedFlavorId, openBoxQuantity!, existingBoxes);

      if (showLocationOverride && overrideStack !== null && overrideHeight !== null) {
        box = { ...box, location: { stack: overrideStack, height: overrideHeight } };
      }

      addBox(box);
    }

    onclose();
  }

  const confirmDisabled = $derived(
    step === 'closed-detail'
      ? !selectedFlavorId || closedBoxCount === null
      : !selectedFlavorId || openBoxQuantity === null
  );

  const confirmLabel = $derived(
    step === 'closed-detail'
      ? closedBoxCount !== null
        ? `Add ${closedBoxCount} Box${closedBoxCount !== 1 ? 'es' : ''}`
        : 'Add Boxes'
      : openBoxQuantity !== null
        ? `Add Open Box (${openBoxQuantity})`
        : 'Add Open Box'
  );
</script>

<Modal {open} title="Add Inventory" {onclose}>
  {#if step === 'mode-select'}
    <div class="mode-select">
      <p class="mode-prompt">What are you adding?</p>

      <div class="mode-options">
        <button class="mode-option" onclick={() => handleSelectMode('closed')} type="button">
          <span class="mode-title">Closed Boxes</span>
          <span class="mode-description">Full, sealed boxes of 12 bottles each</span>
        </button>

        <button class="mode-option" onclick={() => handleSelectMode('open')} type="button">
          <span class="mode-title">Open Box</span>
          <span class="mode-description">A partially used box with a custom bottle count</span>
        </button>
      </div>
    </div>
  {:else}
    <div class="detail-form">
      <!-- Flavor Selection -->
      <div class="form-group">
        <label for="flavor-select">Flavor:</label>
        {#if flavors.length === 0}
          <p class="no-flavors">No flavors added yet. Add a flavor first.</p>
        {:else}
          <select id="flavor-select" bind:value={selectedFlavorId}>
            {#each flavors as flavor}
              <option value={flavor.id}>{flavor.name}</option>
            {/each}
          </select>
        {/if}
      </div>

      <!-- Count / Quantity NumberPad -->
      {#if step === 'closed-detail'}
        <div class="numberpad-container">
          <div
            id="box-count-label"
            class="numberpad-label"
            role="group"
            aria-label="Number of boxes"
          >
            Number of boxes to add (12 bottles each):
          </div>
          <NumberPad
            min={1}
            max={20}
            onselect={handleCountSelect}
            ariaLabelledBy="box-count-label"
          />
        </div>
      {:else}
        <div class="numberpad-container">
          <div id="qty-label" class="numberpad-label" role="group" aria-label="Bottle count">
            Number of bottles in the open box:
          </div>
          <NumberPad min={1} max={12} onselect={handleQuantitySelect} ariaLabelledBy="qty-label" />
        </div>
      {/if}

      <!-- Location -->
      <div class="location-section">
        <div class="location-header">
          <span class="location-label">Location:</span>
          <span class="location-value">
            {showLocationOverride && overrideStack && overrideHeight
              ? formatLocation(overrideStack, overrideHeight)
              : formatLocation(suggestedLocation.stack, suggestedLocation.height) + ' (auto)'}
          </span>
          <button class="location-toggle" onclick={handleToggleLocationOverride} type="button">
            {showLocationOverride ? 'Use auto' : 'Change'}
          </button>
        </div>

        {#if step === 'closed-detail' && closedBoxCount !== null && closedBoxCount > 1 && !showLocationOverride}
          <p class="location-note">
            Boxes 2–{closedBoxCount} will be placed automatically after box 1.
          </p>
        {/if}

        {#if showLocationOverride}
          <div class="location-inputs">
            <div class="form-group">
              <label for="override-stack">Stack (Column):</label>
              <input
                id="override-stack"
                type="number"
                min="1"
                bind:value={overrideStack}
                placeholder="Enter stack number"
              />
            </div>
            <div class="form-group">
              <label for="override-height">Height (Row):</label>
              <input
                id="override-height"
                type="number"
                min="1"
                bind:value={overrideHeight}
                placeholder="Enter height number"
              />
            </div>
          </div>
        {/if}

        {#if locationError}
          <p class="error-message">{locationError}</p>
        {/if}
      </div>

      {#if validationError}
        <p class="error-message">{validationError}</p>
      {/if}
    </div>

    <div class="modal-actions">
      <Button variant="ghost" onclick={onclose}>Cancel</Button>
      <Button variant="secondary" onclick={handleBack}>Back</Button>
      <Button variant="primary" onclick={handleConfirm} disabled={confirmDisabled}>
        {confirmLabel}
      </Button>
    </div>
  {/if}
</Modal>

<style>
  .mode-select {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .mode-prompt {
    margin: 0;
    color: var(--ink-2);
    font-size: var(--font-size-base);
  }

  .mode-options {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .mode-option {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-4);
    border: 2px solid var(--line-1);
    border-radius: var(--r-md);
    background: var(--surface-card);
    cursor: pointer;
    text-align: left;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .mode-option:hover,
  .mode-option:focus-visible {
    border-color: var(--accent);
    background: var(--surface-app);
    outline: none;
  }

  .mode-title {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-base);
    color: var(--ink-1);
  }

  .mode-description {
    font-size: var(--font-size-sm);
    color: var(--ink-2);
  }

  .detail-form {
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
    color: var(--ink-1);
    font-size: var(--font-size-sm);
  }

  .form-group select,
  .form-group input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line-1);
    border-radius: var(--r-sm);
    font-size: var(--font-size-base);
    background: var(--surface-card);
    color: var(--ink-1);
  }

  .no-flavors {
    color: var(--ink-2);
    font-size: var(--font-size-sm);
    margin: 0;
  }

  .numberpad-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .numberpad-label {
    font-weight: var(--font-weight-medium);
    color: var(--ink-1);
    font-size: var(--font-size-base);
    display: block;
  }

  .location-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .location-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .location-label {
    font-weight: var(--font-weight-medium);
    color: var(--ink-2);
    font-size: var(--font-size-sm);
  }

  .location-value {
    font-size: var(--font-size-sm);
    color: var(--ink-1);
    flex: 1;
  }

  .location-toggle {
    background: none;
    border: none;
    color: var(--accent);
    font-size: var(--font-size-sm);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--r-sm);
    text-decoration: underline;
  }

  .location-toggle:hover {
    background: var(--surface-app);
  }

  .location-inputs {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding-top: var(--space-2);
  }

  .location-note {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--ink-2);
  }

  .error-message {
    color: var(--danger);
    font-size: var(--font-size-sm);
    margin: 0;
  }

  .modal-actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-4);
    justify-content: flex-end;
  }
</style>
