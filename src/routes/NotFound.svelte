<script lang="ts">
  /**
   * 404 Not Found Screen
   *
   * Catch-all route for invalid URLs.
   * Provides navigation back to home screen.
   *
   * @component
   */

  import Button from '$lib/components/Button.svelte';
  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
</script>

<div class="not-found-screen">
  <h1>404</h1>
  <h2>Page Not Found</h2>
  <p class="description">
    The page you're looking for doesn't exist. It may have been moved or the URL might be incorrect.
  </p>

  <div class="actions">
    <Button variant="primary" onclick={() => push(ROUTES.HOME)}>Go to Home</Button>
  </div>
</div>

<style>
  .not-found-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--space-6);
    text-align: center;
    gap: var(--space-3);
  }

  h1 {
    font-size: var(--font-size-4xl);
    color: var(--color-danger);
    margin: 0;
    font-weight: var(--font-weight-bold);
  }

  h2 {
    font-size: var(--font-size-xl);
    color: var(--color-text-primary);
    margin: 0;
    font-weight: var(--font-weight-semibold);
  }

  .description {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    max-width: 500px;
    margin: 0;
    line-height: 1.6;
  }

  .actions {
    margin-top: var(--space-4);
  }
</style>
