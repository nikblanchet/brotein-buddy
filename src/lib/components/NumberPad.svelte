<script lang="ts">
  /**
   * NumberPad Component
   *
   * A touch-friendly number pad for entering quantities (1-12).
   * Designed for mobile-first interaction with large touch targets.
   *
   * @component
   * @example
   * ```svelte
   * <NumberPad onselect={(value) => {
   *   if (value === 'keyboard') {
   *     showKeyboardInput();
   *   } else {
   *     setQuantity(value);
   *   }
   * }} />
   * ```
   */

  import { generateNumberRange } from './numberpad-utils.js';

  interface NumberPadProps {
    /**
     * Callback when a number or "keyboard" is selected
     * - number: User tapped a number button (1-12)
     * - 'keyboard': User tapped "Use Keyboard" button
     */
    // eslint-disable-next-line no-unused-vars
    onselect: (value: number | 'keyboard') => void;

    /**
     * Minimum number to display (inclusive)
     *
     * @default 1
     */
    min?: number;

    /**
     * Maximum number to display (inclusive)
     *
     * @default 12
     */
    max?: number;

    /**
     * Whether the number pad is disabled
     *
     * @default false
     */
    disabled?: boolean;
  }

  let { onselect, min = 1, max = 12, disabled = false }: NumberPadProps = $props();

  const numbers = $derived(generateNumberRange(min, max));

  function handleNumberClick(value: number) {
    if (!disabled && onselect) {
      onselect(value);
    }
  }

  function handleKeyboardClick() {
    if (!disabled && onselect) {
      onselect('keyboard');
    }
  }
</script>

<div class="numberpad">
  <!-- Number grid -->
  <div class="numberpad-grid">
    {#each numbers as number}
      <button
        type="button"
        class="numberpad-button"
        {disabled}
        onclick={() => handleNumberClick(number)}
      >
        {number}
      </button>
    {/each}
  </div>

  <!-- Keyboard button -->
  <button
    type="button"
    class="numberpad-button numberpad-button--keyboard"
    {disabled}
    onclick={handleKeyboardClick}
  >
    Use Keyboard
  </button>
</div>

<style>
  /**
   * NumberPad Container
   */
  .numberpad {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
    max-width: 400px;
  }

  /**
   * Number Grid
   * 3-column grid for numbers
   */
  .numberpad-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  /**
   * Number Buttons
   * Large touch-friendly buttons
   */
  .numberpad-button {
    /* Reset */
    background: none;
    border: none;
    margin: 0;
    padding: 0;

    /* Sizing - meets iOS HIG 44px minimum */
    min-height: var(--touch-target-min);
    min-width: var(--touch-target-min);
    aspect-ratio: 1;

    /* Typography */
    font-family: var(--font-family-base);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);

    /* Styling */
    background-color: var(--color-surface-200);
    border: 2px solid var(--color-border-light);
    border-radius: var(--radius-base);
    cursor: pointer;

    /* Transitions */
    transition-property: background-color, border-color, transform, box-shadow;
    transition-duration: var(--transition-fast);
    transition-timing-function: var(--transition-timing);

    /* Interaction */
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .numberpad-button:hover:not(:disabled) {
    background-color: var(--color-surface-300);
    border-color: var(--color-border-medium);
  }

  .numberpad-button:active:not(:disabled) {
    transform: scale(0.95);
    background-color: var(--color-primary);
    color: var(--color-text-inverse);
    border-color: var(--color-primary);
  }

  .numberpad-button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .numberpad-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  /**
   * Keyboard Button
   * Full-width button below number grid
   */
  .numberpad-button--keyboard {
    aspect-ratio: auto;
    width: 100%;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
  }
</style>
