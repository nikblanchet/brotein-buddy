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
  import { appState, updateBoxQuantity } from '$lib/stores';
  import { selectPriorityBox, compareBoxPriority } from '$lib/box-selection';
  import { maybeGetFlavor } from '$lib/utils/flavor';
  import type { Flavor, Box } from '../types/models';
  import { onMount } from 'svelte';

  /**
   * Retrieve selected flavor from sessionStorage
   * This was set by the Random.svelte component
   */
  let selectedFlavorId = $state<string | null>(null);
  let selectedFlavor = $state<Flavor | null>(null);
  let priorityBox = $state<Box | null>(null);
  let alternativeBoxes = $state<Box[]>([]);
  let errorMessage = $state<string | null>(null);

  /**
   * Load flavor and box data on component mount
   */
  onMount(() => {
    const flavorId = sessionStorage.getItem('selectedFlavorId');

    if (!flavorId) {
      errorMessage = 'No flavor selected. Please start from the Random Selection screen.';
      return;
    }

    selectedFlavorId = flavorId;
    selectedFlavor = maybeGetFlavor(flavorId, $appState.flavors);

    if (!selectedFlavor) {
      errorMessage = 'Selected flavor not found. It may have been deleted.';
      return;
    }

    // Get priority box and alternatives
    refreshBoxSelection();
  });

  /**
   * Refresh box selection (called after quantity updates)
   */
  function refreshBoxSelection() {
    if (!selectedFlavorId) return;

    priorityBox = selectPriorityBox($appState.boxes, selectedFlavorId);

    if (!priorityBox) {
      errorMessage = 'No boxes available for this flavor. Add inventory to continue.';
      return;
    }

    // Get alternative boxes (other boxes of same flavor, sorted by priority)
    const allFlavorBoxes = $appState.boxes
      .filter((b) => b.flavorId === selectedFlavorId && b.id !== priorityBox?.id)
      .sort(compareBoxPriority);

    alternativeBoxes = allFlavorBoxes;
    errorMessage = null;
  }

  /**
   * Format location for display
   */
  function formatLocation(box: Box): string {
    return `Stack ${box.location.stack}, Level ${box.location.height}`;
  }

  /**
   * Confirm selection: decrement quantity and go home
   */
  function handleConfirm() {
    if (!priorityBox) return;

    const newQuantity = priorityBox.quantity - 1;
    updateBoxQuantity(priorityBox.id, newQuantity);

    // Clear session storage
    sessionStorage.removeItem('selectedFlavorId');

    // Navigate home
    push(ROUTES.HOME);
  }

  /**
   * Cancel: go back to home without changes
   */
  function handleCancel() {
    // Clear session storage
    sessionStorage.removeItem('selectedFlavorId');

    // Navigate home without changes
    push(ROUTES.HOME);
  }

  /**
   * Add Another: decrement quantity again and stay on this screen
   */
  function handleAddAnother() {
    if (!priorityBox) return;

    const newQuantity = priorityBox.quantity - 1;
    updateBoxQuantity(priorityBox.id, newQuantity);

    // Refresh box selection (priority may have changed)
    refreshBoxSelection();
  }

  /**
   * Different Choice: navigate back to random selection with exclusion
   */
  function handleDifferentChoice() {
    if (!selectedFlavorId) return;

    // Clear session storage
    sessionStorage.removeItem('selectedFlavorId');

    // Navigate to random with exclude parameter
    push(`${ROUTES.RANDOM}?excludeLastPick=${selectedFlavorId}`);
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
            <span class="quantity" class:low-quantity={isLowQuantity(priorityBox)}>
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
    color: var(--color-primary);
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
    color: var(--color-text-primary);
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
    border-radius: var(--radius-base);
    border: 2px solid var(--color-border);
    background: var(--color-background);
  }

  .priority-box {
    border-color: var(--color-primary);
    background: var(--color-background-secondary);
  }

  .box-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .quantity {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .quantity.low-quantity {
    color: var(--color-warning);
  }

  .location {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
  }

  .status {
    font-size: var(--font-size-sm);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    width: fit-content;
    font-weight: var(--font-weight-medium);
  }

  .status.open {
    background: var(--color-success-bg);
    color: var(--color-success);
  }

  .status.unopened {
    background: var(--color-info-bg);
    color: var(--color-info);
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
    color: var(--color-text-secondary);
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
    color: var(--color-text-primary);
    margin: 0;
  }

  .error-message {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
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
    border: 4px solid var(--color-border);
    border-top-color: var(--color-primary);
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
    color: var(--color-text-secondary);
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
      font-size: var(--font-size-4xl);
    }

    h2 {
      font-size: var(--font-size-xl);
    }

    .selection-container {
      max-width: 700px;
    }
  }
</style>
