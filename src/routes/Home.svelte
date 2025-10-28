<script lang="ts">
  /**
   * Home Screen - Placeholder
   *
   * Main navigation screen with four primary action buttons.
   * This is a placeholder implementation that will be replaced
   * in task 2.3 with the full home screen functionality.
   *
   * @component
   */
</script>

<div class="placeholder-screen">
  <h1>Home</h1>
  <p class="status">Coming soon</p>
  <p class="description">
    The home screen will provide four main actions: random flavor selection, favorite flavor
    quick-pick, manual flavor selection, and inventory management.
  </p>

  <div class="actions">
    <p class="note">This placeholder will be replaced in task 2.3</p>
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

  .note {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-style: italic;
  }
</style>
