<script lang="ts">
  /**
   * Random Selection Confirmation Screen - Placeholder
   *
   * Confirmation screen showing the selected flavor and box details,
   * with options to confirm, cancel, add another, or pick different flavor.
   * This is a placeholder implementation that will be replaced in task 2.4.
   *
   * @component
   */

  import Button from '$lib/components/Button.svelte';
  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
</script>

<div class="placeholder-screen">
  <h1>Confirm Selection</h1>
  <p class="status">Coming soon</p>
  <p class="description">
    The confirmation screen will display the randomly selected flavor, show which box to use
    (prioritizing open boxes and lower quantities), and provide options to confirm, cancel, add
    another, or select a different flavor.
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
