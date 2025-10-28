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
  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
  import { appState } from '$lib/stores';
  import { maybeGetFlavor } from '$lib/utils/flavor';

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
   * Navigate to random flavor selection screen
   */
  function handleRandomClick() {
    push(ROUTES.RANDOM);
  }

  /**
   * Navigate to favorite flavor quick-pick
   * Currently disabled if no favorite is configured
   * TODO: In 2.4, implement direct navigation to confirm screen with pre-selected flavor
   */
  function handleFavoriteClick() {
    // For now, navigate to random selection
    // Will be enhanced in 2.4 with pre-selected flavor
    push(ROUTES.RANDOM);
  }

  /**
   * Navigate to manual flavor selection
   * TODO: Create dedicated manual selection route in 2.6
   * Currently navigates to inventory as placeholder
   */
  function handleManualClick() {
    // Placeholder: navigate to inventory until manual selection implemented
    push(ROUTES.INVENTORY);
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
    <h1>Protein Buddy</h1>
    <p class="subtitle">Track & Pick Your Shakes</p>
  </header>

  <div class="buttons-container">
    <!-- Button 1: Random Selection (Most Prominent) -->
    <Button variant="primary" size="lg" fullWidth={true} onclick={handleRandomClick}>
      🎲 Random Pick
    </Button>

    <!-- Button 2: Favorite Flavor Quick-Pick (Second Most Prominent) -->
    <Button
      variant="primary"
      size="lg"
      fullWidth={true}
      disabled={!favoriteFlavor}
      onclick={handleFavoriteClick}
    >
      {favoriteButtonLabel}
    </Button>

    <!-- Button 3: Manual Flavor Selection (Third Prominence) -->
    <Button variant="secondary" size="base" fullWidth={true} onclick={handleManualClick}>
      📋 Choose Flavor
    </Button>

    <!-- Button 4: Inventory Management (Fourth Prominence) -->
    <Button variant="ghost" size="base" fullWidth={true} onclick={handleInventoryClick}>
      📦 Manage Inventory
    </Button>
  </div>
</div>

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
    color: var(--color-text-primary);
    margin: 0;
  }

  .subtitle {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
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
      font-size: var(--font-size-4xl);
    }

    .subtitle {
      font-size: var(--font-size-lg);
    }

    .buttons-container {
      gap: var(--space-6);
      max-width: 480px;
    }
  }
</style>
