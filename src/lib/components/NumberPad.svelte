<script lang="ts">
  /**
   * NumberPad
   *
   * Touch-friendly numeric picker. The 2026 UX refresh tightens this in
   * three ways:
   *  - Default columns chosen from the range size (3-wide for short
   *    ranges of 6 or fewer, 4-wide otherwise) so the grid stays
   *    proportional regardless of how many numbers are shown.
   *  - The currently-selected `value` paints the matching cell with the
   *    pressed treatment (ink-1 bg, surface-card text), and the button
   *    exposes that state through `aria-pressed`.
   *  - The keyboard fallback collapses from a full-width button to a
   *    small underlined link below the grid, demoting it visually since
   *    the curated 1-3 / 1-12 ranges cover the real input cases.
   *
   * @component
   * @example
   * ```svelte
   * <NumberPad value={count} max={3} onselect={(v) => v !== 'keyboard' && (count = v)} />
   * ```
   */

  import { generateNumberRange } from './numberpad-utils.js';

  interface NumberPadProps {
    /**
     * Callback when a number or "keyboard" is selected
     * - number: User tapped a number button
     * - 'keyboard': User tapped the keyboard fallback link
     */
    // eslint-disable-next-line no-unused-vars
    onselect: (value: number | 'keyboard') => void;

    /**
     * The currently-selected numeric value, used to mark the matching
     * button as aria-pressed. Pass null/undefined when nothing is
     * selected yet.
     */
    value?: number | null;

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
     * Number of grid columns. When omitted, falls back to 3 for ranges
     * of 6 or fewer numbers and 4 for anything larger.
     */
    columns?: number;

    /**
     * Whether the number pad is disabled
     *
     * @default false
     */
    disabled?: boolean;

    /**
     * ID of the element that labels this number pad (for accessibility)
     */
    ariaLabelledBy?: string;
  }

  let {
    onselect,
    value = null,
    min = 1,
    max = 12,
    columns,
    disabled = false,
    ariaLabelledBy,
  }: NumberPadProps = $props();

  const numbers = $derived(generateNumberRange(min, max));

  /**
   * Resolve the column count: explicit prop wins; otherwise pick 3 for
   * short ranges (<=6 buttons) and 4 for anything bigger so the grid
   * stays roughly square.
   */
  const resolvedColumns = $derived(columns ?? (numbers.length <= 6 ? 3 : 4));

  function handleNumberClick(n: number) {
    if (!disabled && onselect) {
      onselect(n);
    }
  }

  function handleKeyboardClick() {
    if (!disabled && onselect) {
      onselect('keyboard');
    }
  }
</script>

<div class="numberpad" role="group" aria-labelledby={ariaLabelledBy}>
  <div class="numberpad-grid" style="grid-template-columns: repeat({resolvedColumns}, 1fr);">
    {#each numbers as number}
      <button
        type="button"
        class="numberpad-button"
        {disabled}
        aria-pressed={value === number}
        onclick={() => handleNumberClick(number)}
        aria-label="Select {number}"
      >
        {number}
      </button>
    {/each}
  </div>

  <button
    type="button"
    class="numberpad-kb"
    {disabled}
    onclick={handleKeyboardClick}
    aria-label="Use keyboard to enter number"
  >
    Need a different number? Use keyboard
  </button>
</div>

<style>
  .numberpad {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 400px;
  }

  .numberpad-grid {
    display: grid;
    gap: 8px;
  }

  .numberpad-button {
    appearance: none;
    border: 1px solid var(--line-2);
    background: var(--surface-card);
    color: var(--ink-1);
    font-family: var(--font-family-base);
    font-size: 16px;
    font-weight: var(--font-weight-medium);
    font-variant-numeric: tabular-nums;
    border-radius: var(--r-md);
    cursor: pointer;
    min-height: var(--touch-target-min);
    padding: 0;
    transition:
      background-color 100ms ease,
      border-color 100ms ease,
      color 100ms ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .numberpad-button:hover:not(:disabled):not([aria-pressed='true']) {
    background-color: var(--surface-hover);
  }

  .numberpad-button[aria-pressed='true'] {
    background-color: var(--ink-1);
    color: var(--surface-card);
    border-color: var(--ink-1);
    font-weight: var(--font-weight-semibold);
  }

  .numberpad-button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .numberpad-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  /**
   * Keyboard fallback - small underlined link below the grid. The
   * curated 1-3 / 1-12 ranges cover the real input cases for closed
   * boxes / open bottles, so the keyboard option is intentionally
   * demoted to a quiet link rather than competing with the buttons.
   */
  .numberpad-kb {
    appearance: none;
    background: transparent;
    border: 0;
    color: var(--ink-3);
    font-family: var(--font-family-base);
    font-size: 12px;
    cursor: pointer;
    padding: 4px;
    align-self: center;
    text-decoration: underline;
    text-decoration-color: var(--line-2);
    text-underline-offset: 3px;
  }

  .numberpad-kb:hover:not(:disabled) {
    color: var(--ink-1);
  }

  .numberpad-kb:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
