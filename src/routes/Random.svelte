<script lang="ts">
  /**
   * Random Selection Screen
   *
   * Initiates weighted random flavor selection and navigates to confirmation screen.
   * Uses the weighted random algorithm from lib/random-selection.ts to select a
   * flavor based on total quantity across all boxes, respecting exclusion preferences.
   *
   * @component
   */

  import Button from '$lib/components/Button.svelte';
  import { push, location } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
  import { appState } from '$lib/stores';
  import { selectRandomFlavor } from '$lib/random-selection';
  import { onMount } from 'svelte';

  /**
   * Parse query parameters to check if we should exclude the last pick
   * Format: #/random?excludeLastPick=flavor-id
   */
  let excludeLastPick = $derived.by(() => {
    const params = new URLSearchParams($location.split('?')[1] || '');
    return params.get('excludeLastPick') || undefined;
  });

  /**
   * State for tracking selection status
   */
  let isSelecting = $state(false);
  let errorMessage: string | null = $state(null);

  /**
   * Perform random flavor selection
   * Called automatically on component mount or when "Try Again" is clicked
   */
  function performSelection() {
    isSelecting = true;
    errorMessage = null;

    // Small delay for better UX (shows loading state)
    setTimeout(() => {
      try {
        const flavor = selectRandomFlavor($appState, excludeLastPick);

        if (flavor === null) {
          // No valid flavors available
          errorMessage = determineErrorMessage();
          isSelecting = false;
        } else {
          // Success! Navigate to confirmation with selected flavor
          // Store selected flavor ID in sessionStorage for confirmation screen
          sessionStorage.setItem('selectedFlavorId', flavor.id);
          push(ROUTES.RANDOM_CONFIRM);
        }
      } catch (error) {
        // Unexpected error during selection
        errorMessage = 'An unexpected error occurred during selection.';
        isSelecting = false;
        console.error('Random selection error:', error);
      }
    }, 100);
  }

  /**
   * Determine appropriate error message based on app state
   */
  function determineErrorMessage(): string {
    const { flavors, boxes } = $appState;

    if (flavors.length === 0) {
      return 'No flavors configured. Add some flavors in Inventory Management.';
    }

    const availableFlavors = flavors.filter((f) => !f.excludeFromRandom);
    if (availableFlavors.length === 0) {
      return 'All flavors are excluded from random selection. Update flavor preferences in Inventory Management.';
    }

    const boxesWithQuantity = boxes.filter((b) => b.quantity > 0);
    if (boxesWithQuantity.length === 0) {
      return 'No boxes in stock. Add inventory in Inventory Management.';
    }

    // Flavors exist but none have quantity
    return 'No flavors available with stock. Add more inventory or adjust exclusions.';
  }

  /**
   * Navigate back to home screen
   */
  function handleCancel() {
    push(ROUTES.HOME);
  }

  // Perform selection automatically when component mounts
  onMount(() => {
    // Wait briefly for store to be initialized from localStorage
    setTimeout(() => {
      performSelection();
    }, 50);
  });
</script>

<div class="random-screen">
  {#if isSelecting}
    <!-- Loading State -->
    <div class="loading-container">
      <div class="spinner" aria-label="Loading"></div>
      <p class="loading-text">Selecting a flavor...</p>
    </div>
  {:else if errorMessage}
    <!-- Error State -->
    <div class="error-container">
      <h1>No Selection Available</h1>
      <p class="error-message">{errorMessage}</p>

      <div class="actions">
        <Button variant="primary" size="lg" fullWidth={true} onclick={handleCancel}>
          Back to Home
        </Button>
        <Button variant="secondary" size="base" fullWidth={true} onclick={performSelection}>
          Try Again
        </Button>
      </div>
    </div>
  {/if}
</div>

<style>
  /**
   * Random Screen Layout
   * Centered layout for loading and error states
   */
  .random-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--space-6);
  }

  /**
   * Loading State
   * Displays spinner and loading text
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
   * Error State
   * Displays error message with action buttons
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

  h1 {
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
   * Action Buttons
   * Vertical stack with consistent spacing
   */
  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
    margin-top: var(--space-4);
  }

  /**
   * Responsive Design
   * Larger spacing and fonts on bigger screens
   */
  @media (min-width: 768px) {
    .random-screen {
      padding: var(--space-8);
    }

    h1 {
      font-size: var(--font-size-3xl);
    }

    .loading-text,
    .error-message {
      font-size: var(--font-size-lg);
    }

    .spinner {
      width: 64px;
      height: 64px;
      border-width: 5px;
    }
  }
</style>
