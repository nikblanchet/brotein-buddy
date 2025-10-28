<script lang="ts">
  /**
   * Inventory Management Screen - Placeholder
   *
   * Main inventory screen with visual stack view and table view toggle.
   * This is a placeholder implementation that will be replaced
   * in task 2.5 with the full inventory management functionality.
   *
   * @component
   */

  import Button from '$lib/components/Button.svelte';
  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
</script>

<div class="placeholder-screen">
  <h1>Inventory</h1>
  <p class="status">Coming soon</p>
  <p class="description">
    The inventory screen will display boxes in two views: a visual stack representation showing
    boxes grouped by location, and a table view with sortable columns. Users will be able to tap
    boxes to edit them or navigate to the rearrange screen.
  </p>

  <div class="actions">
    <Button variant="secondary" onclick={() => push(ROUTES.HOME)}>Back to Home</Button>
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
