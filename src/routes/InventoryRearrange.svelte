<script lang="ts">
  /**
   * Drag-and-Drop Rearrange Screen
   *
   * Visual drag-and-drop interface for rearranging boxes in stacks.
   * Enforces validation rules (no floating boxes) and allows users to
   * confirm or cancel changes before saving to state.
   *
   * @component
   */

  import Button from '$lib/components/Button.svelte';
  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
  import { appState, updateBoxLocation } from '$lib/stores';
  import { validateLocationNoGaps } from '$lib/utils/location-validation';
  import { groupBoxesByStack } from '$lib/inventory-utils';
  import { getFlavorTone } from '$lib/utils/flavor-color';
  import { validateRearrangementState } from '$lib/rearrange-utils';
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import type { Box } from '../types/models';

  /**
   * Local working copy of boxes for drag-and-drop manipulation
   */
  let localBoxes = $state<Box[]>(
    $appState.boxes.map((b) => ({ ...b, location: { ...b.location } }))
  );

  /**
   * Original boxes for cancel functionality
   */
  const originalBoxes = [...$appState.boxes];

  /**
   * Validation errors by box ID
   */
  let validationErrors = $state<Map<string, string>>(new Map());

  /**
   * Global validation errors (shown at top)
   */
  let globalErrors = $state<string[]>([]);

  /**
   * Reactive: Group local boxes by stack for visual display
   */
  let boxesByStack = $derived(
    groupBoxesByStack(
      localBoxes.map((box) => {
        const flavor = $appState.flavors.find((f) => f.id === box.flavorId);
        return { box, flavor: flavor || null };
      })
    )
  );

  /**
   * Reactive: Is confirm button disabled due to validation errors?
   */
  let isConfirmDisabled = $derived(validationErrors.size > 0 || globalErrors.length > 0);

  /**
   * Handle drag "consider" event (preview)
   */
  function handleDndConsider(event: CustomEvent<DndEvent<Box>>, stackNumber: number) {
    const { items } = event.detail;
    updateStackBoxes(stackNumber, items as Box[]);
  }

  /**
   * Handle drag "finalize" event (drop completed)
   */
  function handleDndFinalize(event: CustomEvent<DndEvent<Box>>, stackNumber: number) {
    const { items } = event.detail;
    updateStackBoxes(stackNumber, items as Box[]);
    validateAllBoxes();
  }

  /**
   * Update local boxes with new positions for a specific stack
   */
  function updateStackBoxes(stackNumber: number, newBoxes: Box[]) {
    // Update heights for boxes in this stack
    const updatedBoxesInStack = newBoxes.map((box, index) => ({
      ...box,
      location: { stack: stackNumber, height: index + 1 },
    }));

    // Merge with boxes from other stacks
    const boxesInOtherStacks = localBoxes.filter((box) => box.location.stack !== stackNumber);
    localBoxes = [...boxesInOtherStacks, ...updatedBoxesInStack];
  }

  /**
   * Validate all boxes for gaps
   */
  function validateAllBoxes() {
    validationErrors.clear();
    globalErrors = [];

    for (const box of localBoxes) {
      const validation = validateLocationNoGaps(
        box.location.stack,
        box.location.height,
        localBoxes,
        box.id
      );

      if (!validation.isValid && validation.error) {
        validationErrors.set(box.id, validation.error);
      }
    }

    // Refresh state to trigger reactivity
    validationErrors = new Map(validationErrors);
  }

  /**
   * Confirm changes and save to store
   */
  function handleConfirm() {
    // Final validation
    const finalValidation = validateRearrangementState(localBoxes);

    if (!finalValidation.isValid) {
      globalErrors = finalValidation.errors;
      return;
    }

    // Batch update all changed boxes
    for (const box of localBoxes) {
      const original = originalBoxes.find((b) => b.id === box.id);
      if (
        original &&
        (original.location.stack !== box.location.stack ||
          original.location.height !== box.location.height)
      ) {
        updateBoxLocation(box.id, box.location);
      }
    }

    // Return to inventory
    push(ROUTES.INVENTORY);
  }

  /**
   * Cancel changes and return to inventory
   */
  function handleCancel() {
    push(ROUTES.INVENTORY);
  }
</script>

<div class="rearrange-container">
  <!-- Header -->
  <header>
    <h1>Rearrange Boxes</h1>
    <p class="instructions">Drag boxes to reorder. Changes are saved when you confirm.</p>
  </header>

  <!-- Global Errors -->
  {#if globalErrors.length > 0}
    <div class="error-banner" role="alert" aria-live="assertive">
      <h3>Validation Errors:</h3>
      <ul>
        {#each globalErrors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Visual Grid -->
  <div class="stacks-container">
    {#each [...boxesByStack.entries()] as [stackNum, boxes]}
      <div class="stack" data-stack={stackNum}>
        <div class="stack-label">Stack {stackNum}</div>
        <div
          class="stack-boxes"
          use:dndzone={{
            items: boxes.map((b) => b.box),
            flipDurationMs: 200,
            dropTargetStyle: {},
          }}
          onconsider={(e) => handleDndConsider(e, Number(stackNum))}
          onfinalize={(e) => handleDndFinalize(e, Number(stackNum))}
        >
          {#each boxes as { box, flavor } (box.id)}
            <div
              class="box-visual"
              class:box-open={box.isOpen}
              class:box-invalid={validationErrors.has(box.id)}
              style="background-color: {getFlavorTone(box.flavorId).fill};"
              data-box-id={box.id}
            >
              <div class="box-flavor">{flavor?.name || 'Unknown'}</div>
              <div class="box-quantity">{box.quantity} bottles</div>
              {#if validationErrors.has(box.id)}
                <div class="box-error" title={validationErrors.get(box.id)}>
                  {validationErrors.get(box.id)}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- Actions -->
  <div class="actions">
    <Button variant="secondary" onclick={handleCancel}>Cancel</Button>
    <Button variant="primary" disabled={isConfirmDisabled} onclick={handleConfirm}>
      Confirm Changes
    </Button>
  </div>
</div>

<style>
  .rearrange-container {
    padding: var(--space-4);
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
  }

  header {
    margin-bottom: var(--space-6);
  }

  h1 {
    font-size: var(--font-size-2xl);
    color: var(--ink-1);
    margin: 0 0 var(--space-2) 0;
  }

  .instructions {
    font-size: var(--font-size-base);
    color: var(--ink-2);
    margin: 0;
  }

  .error-banner {
    background-color: var(--color-error-bg, #fee);
    border: 2px solid var(--color-error, #c00);
    border-radius: var(--r-md);
    padding: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .error-banner h3 {
    color: var(--color-error, #c00);
    font-size: var(--font-size-lg);
    margin: 0 0 var(--space-2) 0;
  }

  .error-banner ul {
    margin: 0;
    padding-left: var(--space-5);
    color: var(--ink-1);
  }

  .error-banner li {
    margin-bottom: var(--space-1);
  }

  .stacks-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .stack {
    background-color: var(--surface-app);
    border: 1px solid var(--line-1);
    border-radius: var(--r-md);
    padding: var(--space-3);
    min-height: 200px;
  }

  .stack-label {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-base);
    color: var(--ink-1);
    margin-bottom: var(--space-3);
    text-align: center;
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--line-1);
  }

  .stack-boxes {
    min-height: 150px;
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-2);
  }

  .box-visual {
    padding: var(--space-3);
    border-radius: var(--r-sm);
    cursor: grab;
    transition: all var(--transition-base);
    position: relative;
    box-shadow: var(--shadow-1);
  }

  .box-visual:active {
    cursor: grabbing;
  }

  .box-visual.box-open {
    border: 2px solid white;
  }

  .box-visual.box-invalid {
    border: 2px solid var(--color-error, #c00);
    box-shadow: 0 0 0 3px rgba(200, 0, 0, 0.1);
  }

  .box-flavor {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-1);
    color: #ffffff; /* White text for contrast */
    background: rgba(
      0,
      0,
      0,
      0.7
    ); /* Semi-transparent dark background ensures WCAG AA contrast on any box color */
    padding: var(--space-1) var(--space-2);
    border-radius: var(--r-sm);
    display: inline-block;
  }

  .box-quantity {
    font-size: var(--font-size-xs);
    color: #ffffff; /* White text for contrast */
    background: rgba(
      0,
      0,
      0,
      0.7
    ); /* Semi-transparent dark background ensures WCAG AA contrast on any box color */
    padding: var(--space-1) var(--space-2);
    border-radius: var(--r-sm);
    display: inline-block;
  }

  .box-error {
    position: absolute;
    bottom: -24px;
    left: 0;
    right: 0;
    font-size: var(--font-size-xs);
    color: var(--color-error, #c00);
    text-align: center;
    background-color: var(--surface-card);
    padding: var(--space-1);
    border-radius: var(--r-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-4);
    border-top: 1px solid var(--line-1);
  }

  @media (max-width: 768px) {
    .stacks-container {
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    }

    .actions {
      flex-direction: column-reverse;
    }

    .actions :global(button) {
      width: 100%;
    }
  }
</style>
