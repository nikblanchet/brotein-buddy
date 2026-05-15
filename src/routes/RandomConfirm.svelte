<script lang="ts">
  /**
   * Random Selection Confirmation Screen
   *
   * Displays the randomly selected flavor with the priority box to use.
   * Provides four actions: Confirm (decrement and go home), Cancel (no change),
   * Add Another (decrement again), and Different Choice (select new flavor).
   *
   * @component
   */

  import Button from '$lib/components/Button.svelte';
  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
  import {
    appState,
    recordShakeTaken,
    recordShakeRejected,
    recordSelectionCancelled,
  } from '$lib/stores';
  import { selectPriorityBox, compareBoxPriority } from '$lib/box-selection';
  import {
    selectedFlavorId as selectedFlavorIdStore,
    selectedPool as selectedPoolStore,
    selectedMethod as selectedMethodStore,
    clearNavigationState,
  } from '$lib/navigation-state';
  import { maybeGetFlavor } from '$lib/utils/flavor';
  import type { Flavor, Box } from '../types/models';
  import type { EventMethod, EventPool } from '../types/events';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';

  /**
   * Selected flavor ID, retrieved from navigation state store
   */
  let selectedFlavorId = $state<string | null>(null);
  let selectedFlavor = $state<Flavor | null>(null);
  let sessionErrorMessage = $state<string | null>(null);

  /**
   * Selection method and pool snapshotted from navigation state on mount.
   * Captured here (rather than read fresh on each click) so the timeline
   * event records the method that brought the user to this screen — even if
   * the user navigates away and back.
   */
  let selectionMethod = $state<EventMethod>('random');
  let selectionPool = $state<EventPool>(null);

  // Reactive derived values that automatically update when store changes
  let priorityBox = $derived.by(() => {
    if (!selectedFlavorId) return null;
    return selectPriorityBox($appState.boxes, selectedFlavorId);
  });

  let errorMessage = $derived.by(() => {
    // Check for session/loading errors first
    if (sessionErrorMessage) return sessionErrorMessage;

    // Check for "no boxes" error
    if (selectedFlavorId && !priorityBox) {
      return 'No boxes available for this flavor. Add inventory to continue.';
    }

    return null;
  });

  let alternativeBoxes = $derived.by(() => {
    if (!selectedFlavorId || !priorityBox) return [];
    return $appState.boxes
      .filter((b) => b.flavorId === selectedFlavorId && b.id !== priorityBox.id)
      .sort(compareBoxPriority);
  });

  /**
   * Load flavor and box data on component mount
   */
  onMount(() => {
    const flavorId = get(selectedFlavorIdStore);

    if (!flavorId) {
      sessionErrorMessage = 'No flavor selected. Please start from the Random Selection screen.';
      return;
    }

    selectedFlavorId = flavorId;
    selectedFlavor = maybeGetFlavor(flavorId, $appState.flavors);

    if (!selectedFlavor) {
      sessionErrorMessage = 'Selected flavor not found. It may have been deleted.';
      return;
    }

    // Snapshot selection context for the timeline event. Default to 'random'
    // for any direct navigation that bypassed Home.svelte's setters.
    selectionMethod = get(selectedMethodStore) ?? 'random';
    selectionPool = get(selectedPoolStore);

    // No manual refresh needed - derived values automatically compute on first render
  });

  /**
   * Format location for display
   */
  function formatLocation(box: Box): string {
    return `Stack ${box.location.stack}, Level ${box.location.height}`;
  }

  /**
   * Confirm selection: decrement quantity, record event, and go home
   */
  function handleConfirm() {
    if (!priorityBox || !selectedFlavorId) return;

    recordShakeTaken({
      boxId: priorityBox.id,
      flavorId: selectedFlavorId,
      method: selectionMethod,
      pool: selectionPool,
    });

    // Clear navigation state
    clearNavigationState();

    // Navigate home
    push(ROUTES.HOME);
  }

  /**
   * Cancel: go back to home without changes
   */
  function handleCancel() {
    recordSelectionCancelled({
      flavorId: selectedFlavorId,
      method: selectionMethod,
      pool: selectionPool,
    });

    // Clear navigation state
    clearNavigationState();

    // Navigate home without changes
    push(ROUTES.HOME);
  }

  /**
   * Add Another: decrement quantity again and stay on this screen
   */
  function handleAddAnother() {
    if (!priorityBox || !selectedFlavorId) return;

    recordShakeTaken({
      boxId: priorityBox.id,
      flavorId: selectedFlavorId,
      method: selectionMethod,
      pool: selectionPool,
    });

    // No manual refresh needed - derived values automatically update!
  }

  /**
   * Different Choice: navigate back to random selection with exclusion
   */
  function handleDifferentChoice() {
    if (!selectedFlavorId) return;

    const flavorIdToExclude = selectedFlavorId;

    recordShakeRejected({
      rejectedFlavorId: flavorIdToExclude,
      method: selectionMethod,
      pool: selectionPool,
    });

    // Clear flavor selection but preserve selectedPool / selectedMethod
    // for the re-roll (the user is still in the same random flow).
    selectedFlavorIdStore.set(null);

    // Navigate to random with exclude parameter
    push(`${ROUTES.RANDOM}?excludeLastPick=${flavorIdToExclude}`);
  }

  /**
   * Check if box quantity is running low (3 or fewer)
   */
  function isLowQuantity(box: Box): boolean {
    return box.quantity <= 3;
  }
</script>

<div class="confirm-screen">
  {#if errorMessage}
    <!-- Error State -->
    <div class="error-container">
      <h1>Unable to Confirm</h1>
      <p class="error-message">{errorMessage}</p>

      <div class="actions">
        <Button variant="primary" size="lg" fullWidth={true} onclick={() => push(ROUTES.HOME)}>
          Back to Home
        </Button>
      </div>
    </div>
  {:else if selectedFlavor && priorityBox}
    <!-- Success State: Display Selection -->
    <div class="selection-container">
      <!-- Flavor Name (Most Prominent) -->
      <h1 class="flavor-name">{selectedFlavor.name}</h1>

      <!-- Priority Box Details -->
      <div class="box-details">
        <h2>Use This Box</h2>
        <div class="box-card priority-box">
          <div class="box-info">
            <span
              class="quantity"
              class:low-quantity={isLowQuantity(priorityBox)}
              aria-live="polite"
              aria-label={isLowQuantity(priorityBox)
                ? `Low quantity: ${priorityBox.quantity} shake${priorityBox.quantity !== 1 ? 's' : ''} remaining`
                : undefined}
            >
              {priorityBox.quantity} shake{priorityBox.quantity !== 1 ? 's' : ''}
            </span>
            <span class="location">{formatLocation(priorityBox)}</span>
            <span class="status {priorityBox.isOpen ? 'open' : 'unopened'}">
              {priorityBox.isOpen ? 'Open' : 'Unopened'}
            </span>
          </div>
        </div>
      </div>

      <!-- Alternative Boxes (if any) -->
      {#if alternativeBoxes.length > 0}
        <div class="alternatives">
          <h3>Alternative Boxes</h3>
          <div class="alternative-list">
            {#each alternativeBoxes as box (box.id)}
              <div class="box-card alternative-box">
                <span class="quantity">{box.quantity}</span>
                <span class="location">{formatLocation(box)}</span>
                <span class="status {box.isOpen ? 'open' : 'unopened'}">
                  {box.isOpen ? 'Open' : 'Unopened'}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="actions">
        <Button variant="primary" size="lg" fullWidth={true} onclick={handleConfirm}>
          Confirm
        </Button>

        <Button
          variant="secondary"
          size="base"
          fullWidth={true}
          disabled={priorityBox.quantity <= 1}
          onclick={handleAddAnother}
        >
          Add Another ({priorityBox.quantity - 1} left)
        </Button>

        <div class="secondary-actions">
          <Button variant="ghost" size="base" onclick={handleDifferentChoice}>
            Different Choice
          </Button>
          <Button variant="ghost" size="base" onclick={handleCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  {:else}
    <!-- Loading State (brief, should quickly resolve to error or success) -->
    <div class="loading-container">
      <div class="spinner" aria-label="Loading"></div>
      <p class="loading-text">Loading selection...</p>
    </div>
  {/if}
</div>

<style>
  /**
   * Confirm Screen Layout
   * Centered container with vertical flow
   */
  .confirm-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--space-6);
  }

  /**
   * Selection Container
   * Main content area for successful selection
   */
  .selection-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    width: 100%;
    max-width: 600px;
  }

  /**
   * Flavor Name
   * Large, prominent display of selected flavor
   */
  .flavor-name {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--accent);
    margin: 0;
    text-align: center;
  }

  /**
   * Box Details Section
   * Priority box information
   */
  .box-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
  }

  h2 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-medium);
    color: var(--ink-1);
    margin: 0;
    text-align: center;
  }

  /**
   * Box Card
   * Display box information in a card
   */
  .box-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4);
    border-radius: var(--r-md);
    border: 2px solid var(--line-1);
    background: var(--surface-app);
  }

  .priority-box {
    border-color: var(--accent);
    background: var(--surface-app);
  }

  .box-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .quantity {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--ink-1);
  }

  .quantity.low-quantity {
    color: var(--accent);
  }

  .location {
    font-size: var(--font-size-base);
    color: var(--ink-2);
  }

  .status {
    font-size: var(--font-size-sm);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--r-sm);
    width: fit-content;
    font-weight: var(--font-weight-medium);
  }

  .status.open {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  .status.unopened {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  /**
   * Alternative Boxes Section
   */
  .alternatives {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
  }

  h3 {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--ink-2);
    margin: 0;
    text-align: center;
  }

  .alternative-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .alternative-box {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3);
  }

  .alternative-box .quantity {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
  }

  .alternative-box .location,
  .alternative-box .status {
    font-size: var(--font-size-sm);
  }

  /**
   * Action Buttons
   * Vertical stack with primary and secondary actions
   */
  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
    margin-top: var(--space-4);
  }

  .secondary-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: center;
  }

  /**
   * Error State
   */
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    text-align: center;
    max-width: 500px;
    width: 100%;
  }

  .error-container h1 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--ink-1);
    margin: 0;
  }

  .error-message {
    font-size: var(--font-size-base);
    color: var(--ink-2);
    line-height: 1.6;
    margin: 0;
  }

  /**
   * Loading State
   */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    text-align: center;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--line-1);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    font-size: var(--font-size-lg);
    color: var(--ink-2);
    margin: 0;
  }

  /**
   * Responsive Design
   * Larger spacing and fonts on bigger screens
   */
  @media (min-width: 768px) {
    .confirm-screen {
      padding: var(--space-8);
    }

    .flavor-name {
      font-size: var(--font-size-3xl);
    }

    h2 {
      font-size: var(--font-size-xl);
    }

    .selection-container {
      max-width: 700px;
    }
  }
</style>
