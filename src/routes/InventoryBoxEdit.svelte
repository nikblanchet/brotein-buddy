<script lang="ts">
  /**
   * Box Edit Screen - Placeholder
   *
   * Screen for editing individual box properties: quantity, location, open/closed status.
   * This is a placeholder implementation that will be replaced
   * in task 2.6 with the full box editing functionality.
   *
   * @component
   */

  import Button from '$lib/components/Button.svelte';
  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';

  // In the real implementation, this will extract boxId from route params
  // For now, it's just a placeholder
</script>

<div class="placeholder-screen">
  <h1>Edit Box</h1>
  <p class="status">Coming soon</p>
  <p class="description">
    The box edit screen will allow users to add or remove quantities using the number pad, change
    the box location with conflict resolution, and toggle the open/closed status. Changes will be
    saved to the application state.
  </p>

  <div class="actions">
    <Button variant="secondary" onclick={() => push(ROUTES.INVENTORY)}>Back to Inventory</Button>
  </div>
</div>

<style>
  .placeholder-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--space-6);
    text-align: center;
    gap: var(--space-4);
  }

  h1 {
    font-size: var(--font-size-2xl);
    color: var(--color-text-primary);
    margin: 0;
  }

  .status {
    font-size: var(--font-size-lg);
    color: var(--color-primary);
    font-weight: var(--font-weight-medium);
    margin: 0;
  }

  .description {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    max-width: 600px;
    margin: 0;
    line-height: 1.6;
  }

  .actions {
    margin-top: var(--space-4);
  }
</style>
