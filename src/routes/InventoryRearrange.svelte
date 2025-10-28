<script lang="ts">
  /**
   * Drag-and-Drop Rearrange Screen - Placeholder
   *
   * Screen for visually rearranging boxes in stacks using drag-and-drop.
   * This is a placeholder implementation that will be replaced
   * in task 2.7 with the full drag-and-drop functionality.
   *
   * @component
   */

  import Button from '$lib/components/Button.svelte';
  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
</script>

<div class="placeholder-screen">
  <h1>Rearrange Boxes</h1>
  <p class="status">Coming soon</p>
  <p class="description">
    The rearrange screen will provide a drag-and-drop interface for moving boxes between stacks and
    positions. It will enforce validation rules (no floating boxes) and allow users to confirm or
    cancel changes before saving to state.
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
