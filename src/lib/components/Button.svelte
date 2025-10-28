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

  import { getButtonClasses, type ButtonProps } from './button-utils.js';

  let {
    variant = 'primary',
    size = 'base',
    disabled = false,
    fullWidth = false,
    type = 'button',
    onclick,
  }: ButtonProps = $props();

  const buttonClasses = $derived(getButtonClasses(variant, size, fullWidth));
</script>

<button class={buttonClasses} {type} {disabled} {onclick}>
  <slot />
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
    border-radius: var(--radius-base);
    transition-property: background-color, border-color, transform, box-shadow;
    transition-duration: var(--transition-base);
    transition-timing-function: var(--transition-timing);

    /* Interaction */
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .button:focus-visible {
    outline: 2px solid var(--color-primary);
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
    background-color: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .button--primary:hover:not(:disabled) {
    background-color: var(--color-primary-hover);
  }

  .button--primary:active:not(:disabled) {
    background-color: var(--color-primary-active);
  }

  /* Secondary: Outlined */
  .button--secondary {
    background-color: transparent;
    color: var(--color-primary);
    border: 2px solid var(--color-primary);
  }

  .button--secondary:hover:not(:disabled) {
    background-color: var(--color-primary);
    color: var(--color-text-inverse);
  }

  /* Danger: Destructive action */
  .button--danger {
    background-color: var(--color-danger);
    color: var(--color-text-inverse);
  }

  .button--danger:hover:not(:disabled) {
    background-color: var(--color-danger-hover);
  }

  /* Ghost: Transparent */
  .button--ghost {
    background-color: transparent;
    color: var(--color-text-primary);
  }

  .button--ghost:hover:not(:disabled) {
    background-color: var(--color-surface-300);
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
    min-height: 40px;
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
    width: 100%;
  }
</style>
