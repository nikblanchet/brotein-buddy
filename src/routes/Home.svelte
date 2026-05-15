<script lang="ts">
  /**
   * Home Screen
   *
   * Main navigation screen with four primary action buttons for accessing
   * key features: random selection, favorite flavor quick-pick, manual
   * selection, and inventory management.
   *
   * @component
   */

  import Button from '$lib/components/Button.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
  import { appState } from '$lib/stores';
  import { selectedFlavorId, selectedPool, selectedMethod } from '$lib/navigation-state';
  import { maybeGetFlavor } from '$lib/utils/flavor';
  import type { Flavor, RandomPool } from '../types/models';

  /**
   * Reactive: Get the user's favorite flavor (if configured)
   * Returns null if no favorite is set or flavor not found
   */
  let favoriteFlavor = $derived(maybeGetFlavor($appState.favoriteFlavorId, $appState.flavors));

  /**
   * Reactive: Determine the favorite button label
   * Shows flavor name if configured, "Set Favorite" otherwise
   */
  let favoriteButtonLabel = $derived(
    favoriteFlavor ? `❤️ ${favoriteFlavor.name}` : '❤️ Set Favorite'
  );

  /**
   * State for flavor picker modal
   */
  let showFlavorPicker = $state(false);

  /**
   * Navigate to random flavor selection screen for a specific pool
   */
  function handleRandomClick(pool: RandomPool) {
    selectedPool.set(pool);
    selectedMethod.set('random');
    push(ROUTES.RANDOM);
  }

  /**
   * Navigate to favorite flavor quick-pick
   * Navigates directly to confirmation with favorite flavor pre-selected
   */
  function handleFavoriteClick() {
    if (favoriteFlavor) {
      selectedFlavorId.set(favoriteFlavor.id);
      selectedPool.set(null);
      selectedMethod.set('favorite');
      push(ROUTES.RANDOM_CONFIRM);
    }
  }

  /**
   * Show flavor picker modal for manual selection
   */
  function handleManualClick() {
    showFlavorPicker = true;
  }

  /**
   * Handle flavor selection from picker
   * Navigates to confirmation screen with selected flavor
   */
  function handleFlavorSelect(flavor: Flavor) {
    selectedFlavorId.set(flavor.id);
    selectedPool.set(null);
    selectedMethod.set('manual');
    showFlavorPicker = false;
    push(ROUTES.RANDOM_CONFIRM);
  }

  /**
   * Navigate to inventory management screen
   */
  function handleInventoryClick() {
    push(ROUTES.INVENTORY);
  }
</script>

<div class="home-screen">
  <header class="home-header">
    <h1>BroteinBuddy</h1>
    <p class="subtitle">Track & Pick Your Shakes</p>
  </header>

  <div class="buttons-container">
    <!-- Button 1a: Caffeinated Random Selection -->
    <Button
      variant="primary"
      size="lg"
      fullWidth={true}
      onclick={() => handleRandomClick('caffeinated')}
      ariaLabel="Random Caffeinated Pick"
      testId="random-caffeinated-button"
    >
      ⚡ Random Pick
    </Button>

    <!-- Button 1b: Caffeine-Free Random Selection -->
    <Button
      variant="primary"
      size="lg"
      fullWidth={true}
      onclick={() => handleRandomClick('caffeine-free')}
      ariaLabel="Random Caffeine-Free Pick"
      testId="random-caffeine-free-button"
    >
      💪 Random Pick
    </Button>

    <!-- Button 2: Favorite Flavor Quick-Pick (Second Most Prominent) -->
    <Button
      variant="primary"
      size="lg"
      fullWidth={true}
      disabled={!favoriteFlavor}
      onclick={handleFavoriteClick}
      testId="favorite-button"
      ariaLabel={favoriteFlavor
        ? `Quick-pick favorite flavor: ${favoriteFlavor.name}`
        : 'Set Favorite Flavor'}
    >
      {favoriteButtonLabel}
    </Button>

    <!-- Button 3: Manual Flavor Selection (Third Prominence) -->
    <Button
      variant="secondary"
      size="base"
      fullWidth={true}
      onclick={handleManualClick}
      ariaLabel="Choose Flavor Manually"
    >
      📋 Choose Flavor
    </Button>

    <!-- Button 4: Inventory Management (Fourth Prominence) -->
    <Button
      variant="ghost"
      size="base"
      fullWidth={true}
      onclick={handleInventoryClick}
      ariaLabel="Manage Inventory"
    >
      📦 Manage Inventory
    </Button>
  </div>
</div>

<!-- Flavor Picker Modal -->
<Modal open={showFlavorPicker} title="Choose a Flavor" onclose={() => (showFlavorPicker = false)}>
  {#if $appState.flavors.length === 0}
    <div class="empty-state">
      <p>No flavors available. Add flavors in Inventory Management first.</p>
    </div>
  {:else}
    <div class="flavor-list">
      {#each $appState.flavors as flavor (flavor.id)}
        <button class="flavor-item" onclick={() => handleFlavorSelect(flavor)} type="button">
          <span class="flavor-name">{flavor.name}</span>
          {#if flavor.randomPool === 'caffeinated'}
            <span class="pool-badge">⚡</span>
          {:else if flavor.randomPool === 'caffeine-free'}
            <span class="pool-badge">💪</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</Modal>

<style>
  /**
   * Home Screen Layout
   * Mobile-first responsive design with vertical button stack
   */
  .home-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--space-6);
    gap: var(--space-8);
  }

  /**
   * Header Section
   * App title and tagline
   */
  .home-header {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  h1 {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--ink-1);
    margin: 0;
  }

  .subtitle {
    font-size: var(--font-size-base);
    color: var(--ink-2);
    margin: 0;
  }

  /**
   * Buttons Container
   * Vertical stack with consistent spacing
   */
  .buttons-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    width: 100%;
    max-width: 400px;
  }

  /**
   * Responsive Design
   * Increase spacing and font sizes on larger screens
   */
  @media (min-width: 768px) {
    .home-screen {
      padding: var(--space-8);
    }

    h1 {
      font-size: var(--font-size-3xl);
    }

    .subtitle {
      font-size: var(--font-size-lg);
    }

    .buttons-container {
      gap: var(--space-6);
      max-width: 480px;
    }
  }

  /**
   * Flavor Picker Modal Styles
   */
  .empty-state {
    padding: var(--space-6);
    text-align: center;
  }

  .empty-state p {
    color: var(--ink-2);
    margin: 0;
  }

  .flavor-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-height: 60vh;
    overflow-y: auto;
  }

  .flavor-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    padding: var(--space-4);
    background: var(--surface-card);
    border: 1px solid var(--line-1);
    border-radius: var(--r-md);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
  }

  .flavor-item:hover {
    background: var(--surface-hover);
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  .flavor-item:active {
    transform: translateY(0);
  }

  .flavor-name {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--ink-1);
  }

  .pool-badge {
    font-size: var(--font-size-base);
  }
</style>
