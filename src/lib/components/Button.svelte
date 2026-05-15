<script lang="ts">
  /**
   * Button Component
   *
   * A versatile button component with multiple variants, sizes, and states.
   * Follows accessibility best practices and uses design tokens for consistency.
   *
   * @component
   * @example
   * ```svelte
   * <Button variant="primary" size="lg" onclick={() => console.log('clicked')}>
   *   Click Me
   * </Button>
   * ```
   */

  import type { Snippet } from 'svelte';
  import { getButtonClasses, type ButtonProps } from './button-utils.js';

  interface Props extends ButtonProps {
    children?: Snippet;
    testId?: string;
    ariaLabel?: string;
  }

  let {
    variant = 'primary',
    size = 'base',
    disabled = false,
    fullWidth = false,
    type = 'button',
    onclick,
    children,
    testId,
    ariaLabel,
  }: Props = $props();

  const buttonClasses = $derived(getButtonClasses(variant, size, fullWidth));
</script>

<button
  class={buttonClasses}
  {type}
  {disabled}
  {onclick}
  data-testid={testId}
  aria-label={ariaLabel}
>
  {@render children?.()}
</button>

<style>
  /**
   * Base button styles
   * Common styles shared across all button variants
   */
  .button {
    /* Reset */
    border: none;
    background: none;
    margin: 0;
    padding: 0;
    cursor: pointer;

    /* Typography */
    font-family: var(--font-family-base);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-normal);
    text-align: center;

    /* Layout */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);

    /* Styling */
    border-radius: var(--r-md);
    transition-property: background-color, border-color, transform, box-shadow;
    transition-duration: var(--transition-base);
    transition-timing-function: var(--transition-timing);

    /* Interaction */
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .button:active:not(:disabled) {
    transform: translateY(1px);
  }

  .button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  /* ========================================
     Variant Styles
     ======================================== */

  /* Primary: Main call-to-action */
  .button--primary {
    background-color: var(--accent);
    color: var(--surface-card);
  }

  .button--primary:hover:not(:disabled) {
    background-color: var(--accent-ink);
  }

  .button--primary:active:not(:disabled) {
    background-color: var(--accent-ink);
  }

  /* Secondary: Outlined */
  .button--secondary {
    background-color: transparent;
    color: var(--accent);
    border: 2px solid var(--accent);
  }

  .button--secondary:hover:not(:disabled) {
    background-color: var(--accent);
    color: var(--surface-card);
  }

  /* Danger: Destructive action */
  .button--danger {
    background-color: var(--danger);
    color: var(--surface-card);
  }

  .button--danger:hover:not(:disabled) {
    background-color: var(--danger);
  }

  /* Ghost: Transparent */
  .button--ghost {
    background-color: transparent;
    color: var(--ink-1);
  }

  .button--ghost:hover:not(:disabled) {
    background-color: var(--surface-sunk);
  }

  /* ========================================
     Size Styles
     ======================================== */

  .button--sm {
    min-height: 32px;
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-sm);
  }

  .button--base {
    min-height: 44px;
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-base);
  }

  .button--lg {
    min-height: 48px;
    padding: var(--space-3) var(--space-6);
    font-size: var(--font-size-lg);
  }

  /* ========================================
     Width Modifier
     ======================================== */

  .button--full-width {
    display: flex; /* Override inline-flex from base for full-width layout */
    width: 100%;
  }
</style>
