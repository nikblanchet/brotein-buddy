<script lang="ts">
  /**
   * Location Picker
   *
   * Visual replacement for the old "type the stack and height" inputs:
   * shows the existing inventory as colored cells in a stack diagram and
   * lets the user tap an empty slot at the top of any stack (or a new
   * stack column on the right) to place a new box there.
   *
   * Two modes:
   *  - auto: the suggested next location is highlighted and the slot is
   *    chosen automatically; cells are not interactive.
   *  - pick: every available top-of-stack and the NEW slot is tappable;
   *    the user's selection paints with the accent treatment.
   *
   * The render data comes from `buildPickerStacks` so this component
   * stays a thin shell over the unit-tested helpers.
   */

  import { buildPickerStacks } from '$lib/utils/location-picker';
  import { formatLocation } from '$lib/utils/location-validation';
  import { getFlavorTone } from '$lib/utils/flavor-color';
  import type { Box, Flavor, Location } from '../../types/models';

  interface Props {
    /** Existing inventory used to lay out the stack diagram */
    boxes: ReadonlyArray<Box>;
    /** All known flavors, used to look up tone + name for cell rendering */
    flavors: ReadonlyArray<Flavor>;
    /** Current picker mode: auto-suggest or tap-to-pick */
    mode: 'auto' | 'pick';
    /** User's tap-selected slot, or null if none chosen yet */
    selected: Location | null;
    /** Suggested next location from suggestNextLocation - the auto-mode pick */
    suggested: Location;
    /** Mode toggle handler */
    // eslint-disable-next-line no-unused-vars
    onModeChange: (mode: 'auto' | 'pick') => void;
    /** Slot tap handler (only fires in pick mode) */
    // eslint-disable-next-line no-unused-vars
    onSelect: (location: Location) => void;
  }

  const { boxes, flavors, mode, selected, suggested, onModeChange, onSelect }: Props = $props();

  const picker = $derived(buildPickerStacks(boxes, flavors));

  /**
   * "CC" for "Cookies & Cream", "DD" for "Decadent Dark Chocolate".
   * Splits on whitespace AND `&` so ampersand-joined names contribute
   * to the initials, then takes the first two starting letters.
   */
  function initials(name: string): string {
    return name
      .split(/[\s&]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function isSelected(stack: number, height: number): boolean {
    return selected !== null && selected.stack === stack && selected.height === height;
  }

  function isSuggested(stack: number, height: number): boolean {
    return suggested.stack === stack && suggested.height === height;
  }
</script>

<div class="loc-pick">
  <div class="loc-pick-head">
    <span class="field-label">Location</span>
    <div class="seg" role="group" aria-label="Location mode">
      <button
        type="button"
        aria-pressed={mode === 'auto'}
        onclick={() => onModeChange('auto')}
        data-testid="loc-mode-auto"
      >
        Auto
      </button>
      <button
        type="button"
        aria-pressed={mode === 'pick'}
        onclick={() => onModeChange('pick')}
        data-testid="loc-mode-pick"
      >
        Pick spot
      </button>
    </div>
  </div>

  <div class="loc-readout" data-testid="loc-readout">
    {#if mode === 'auto'}
      Will place at <strong>{formatLocation(suggested.stack, suggested.height)}</strong> (next available)
    {:else if selected}
      Placing at <strong>{formatLocation(selected.stack, selected.height)}</strong>
    {:else}
      <span class="loc-readout-placeholder">Tap an empty slot below</span>
    {/if}
  </div>

  <div class="loc-grid">
    <div class="loc-stacks">
      {#each picker.stacks as column (column.stack)}
        <div class="loc-stack">
          {#if mode === 'pick'}
            {@const slotH = column.nextHeight}
            <button
              type="button"
              class="loc-cell empty"
              class:selected={isSelected(column.stack, slotH)}
              class:suggested={!isSelected(column.stack, slotH) && isSuggested(column.stack, slotH)}
              onclick={() => onSelect({ stack: column.stack, height: slotH })}
              aria-label={`Place at stack ${column.stack}, row ${slotH}`}
              data-testid="loc-empty-{column.stack}-{slotH}"
            >
              <span class="plus-mark" aria-hidden="true">+</span>
            </button>
          {/if}

          {#each column.existing as { box, flavor } (box.id)}
            {@const tone = getFlavorTone(box.flavorId)}
            <div
              class="loc-cell"
              style="background: {tone.fill}; color: {tone.ink};"
              title={`${flavor?.name ?? 'Unknown'} · qty ${box.quantity}`}
            >
              <div>
                <div class="cell-init">{initials(flavor?.name ?? '?')}</div>
                <div class="cell-qty">{box.quantity}</div>
              </div>
            </div>
          {/each}

          <div class="loc-stack-num">S{column.stack}</div>
        </div>
      {/each}

      <div class="loc-stack loc-new-stack">
        {#if mode === 'pick'}
          <button
            type="button"
            class="loc-cell empty"
            class:selected={isSelected(picker.newStackNumber, 1)}
            class:suggested={!isSelected(picker.newStackNumber, 1) &&
              isSuggested(picker.newStackNumber, 1)}
            onclick={() => onSelect({ stack: picker.newStackNumber, height: 1 })}
            aria-label={`Start new stack ${picker.newStackNumber}`}
            data-testid="loc-empty-new"
          >
            <span class="plus-mark" aria-hidden="true">+</span>
          </button>
        {:else}
          <div class="loc-cell empty new-disabled" aria-hidden="true">
            <span class="plus-mark">+</span>
          </div>
        {/if}
        <div class="loc-stack-num">NEW</div>
      </div>
    </div>
  </div>

  {#if mode === 'pick'}
    <p class="field-hint">
      Tap any dashed slot above to place the box there. Existing boxes are read-only.
    </p>
  {/if}
</div>

<style>
  .loc-pick {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .loc-pick-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .field-label {
    font-size: 12px;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--ink-3);
  }

  .field-hint {
    font-size: 12px;
    color: var(--ink-3);
    line-height: 1.5;
    margin: 0;
  }

  .seg {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    background: var(--surface-sunk);
    padding: 3px;
    border-radius: var(--r-md);
    border: 1px solid var(--line-1);
  }

  .seg button {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    font-family: inherit;
    font-size: 13px;
    font-weight: var(--font-weight-medium);
    padding: 8px 12px;
    border-radius: 7px;
    cursor: pointer;
  }

  .seg button[aria-pressed='true'] {
    background: var(--surface-card);
    color: var(--ink-1);
    box-shadow: var(--shadow-1);
    font-weight: var(--font-weight-semibold);
  }

  .loc-readout {
    font-size: 13px;
    color: var(--ink-2);
  }

  .loc-readout strong {
    color: var(--ink-1);
    font-weight: var(--font-weight-semibold);
  }

  .loc-readout-placeholder {
    color: var(--ink-3);
  }

  .loc-grid {
    background: var(--surface-sunk);
    border: 1px solid var(--line-1);
    border-radius: var(--r-md);
    padding: 12px;
    overflow-x: auto;
  }

  .loc-stacks {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    min-height: 100px;
  }

  .loc-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 44px;
    flex: 0 0 auto;
  }

  .loc-stack-num {
    font-family: var(--font-family-mono);
    font-size: 10px;
    color: var(--ink-3);
    text-align: center;
    margin-top: 6px;
    letter-spacing: 0.04em;
  }

  .loc-cell {
    width: 44px;
    height: 44px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    font-size: 10px;
    font-weight: var(--font-weight-semibold);
    text-align: center;
    line-height: 1.1;
    padding: 2px;
    overflow: hidden;
    border: 0;
  }

  .loc-cell.empty {
    background: transparent;
    border: 1.5px dashed var(--line-2);
    color: var(--ink-3);
    cursor: pointer;
  }

  .loc-cell.empty.new-disabled {
    cursor: default;
    opacity: 0.55;
  }

  .loc-cell.empty:not(.new-disabled):hover {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  .loc-cell.empty.suggested {
    border-color: var(--accent);
    border-style: solid;
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  .loc-cell.empty.selected {
    border: 2px solid var(--accent);
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-weight: var(--font-weight-bold);
  }

  .loc-cell .plus-mark {
    font-size: 14px;
  }

  .loc-cell .cell-init {
    font-size: 11px;
    font-weight: var(--font-weight-bold);
  }

  .loc-cell .cell-qty {
    font-family: var(--font-family-mono);
    font-size: 9px;
    opacity: 0.7;
    margin-top: 1px;
  }

  .loc-new-stack {
    border-left: 1.5px dashed var(--line-2);
    padding-left: 8px;
    margin-left: 4px;
  }
</style>
