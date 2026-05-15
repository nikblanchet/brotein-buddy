<script lang="ts">
  /**
   * Flavor Picker Sheet
   *
   * Bottom sheet on phone, side panel on laptop. Lists every flavor
   * grouped by pool with a small color swatch and emits an `onselect`
   * with the chosen flavor. Used by both the Set Favorite pill (caller
   * writes favoriteFlavorId) and the "Or choose a specific flavor" link
   * on the Pick screen (caller runs the manual-pick flow).
   *
   * The sheet is a presentational component - the parent owns whether it
   * is open and what to do with the chosen flavor. Mounting position is
   * the parent's responsibility too: render this as a sibling of
   * .app-shell so the absolute-positioned sheet escapes the grid and
   * does not overlap the bottom tab bar.
   */

  import { getFlavorTone } from '$lib/utils/flavor-color';
  import type { Flavor } from '../../types/models';

  interface Props {
    /** Whether the sheet is currently presented */
    open: boolean;
    /** Title text rendered in the sheet header */
    title: string;
    /** All available flavors */
    flavors: readonly Flavor[];
    /** Callback when a flavor row is tapped */
    // eslint-disable-next-line no-unused-vars
    onselect: (flavor: Flavor) => void;
    /** Callback to close the sheet (backdrop tap, close button) */
    onclose: () => void;
  }

  const { open, title, flavors, onselect, onclose }: Props = $props();

  function poolLabel(flavor: Flavor): string | null {
    if (flavor.randomPool === 'caffeinated') return 'Caff';
    if (flavor.randomPool === 'caffeine-free') return 'Decaf';
    return null;
  }
</script>

{#if open}
  <button type="button" class="sheet-backdrop" aria-label="Close flavor picker" onclick={onclose}
  ></button>
{/if}

<div
  class="sheet flavor-picker"
  class:open
  role="dialog"
  aria-modal="true"
  aria-label={title}
  data-testid="flavor-picker-sheet"
>
  <div class="grabber" aria-hidden="true"></div>

  <div class="panel-head">
    <h2>{title}</h2>
    <button class="icon-btn" onclick={onclose} aria-label="Close">✕</button>
  </div>

  <div class="panel-body">
    {#if flavors.length === 0}
      <p class="empty">No flavors yet. Add one from Inventory.</p>
    {:else}
      <div class="flavor-list" role="radiogroup" aria-label={title}>
        {#each flavors as flavor (flavor.id)}
          {@const tone = getFlavorTone(flavor.id)}
          {@const pool = poolLabel(flavor)}
          <button
            type="button"
            class="flavor-row"
            data-testid="flavor-row-{flavor.id}"
            onclick={() => onselect(flavor)}
          >
            <span class="swatch" style="background: {tone.accent};" aria-hidden="true"></span>
            <span class="name">{flavor.name}</span>
            {#if pool}
              <span class="pool">{pool}</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /**
   * Sheet container - phone first. Slides up from the bottom; backdrop
   * fades in. Sibling .sheet-backdrop (rendered above) handles the dim
   * + dismiss tap target.
   */
  .sheet {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 92%;
    background: var(--surface-card);
    border-top-left-radius: 18px;
    border-top-right-radius: 18px;
    z-index: 10;
    transform: translateY(100%);
    transition: transform var(--transition-pop);
    display: flex;
    flex-direction: column;
    box-shadow: 0 -8px 32px oklch(0 0 0 / 0.15);
    overflow: hidden;
  }

  .sheet.open {
    transform: translateY(0);
  }

  .sheet-backdrop {
    position: absolute;
    inset: 0;
    background: oklch(0 0 0 / 0.32);
    z-index: 9;
    border: 0;
    padding: 0;
    cursor: pointer;
    animation: fade-in 180ms ease;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .grabber {
    width: 36px;
    height: 4px;
    background: var(--line-2);
    border-radius: 999px;
    margin: 8px auto 4px;
    flex-shrink: 0;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px 12px;
    border-bottom: 1px solid var(--line-1);
  }

  .panel-head h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .panel-body {
    overflow-y: auto;
    padding: 20px;
    flex: 1;
  }

  .icon-btn {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    width: 36px;
    height: 36px;
    border-radius: var(--r-md);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
  }

  .icon-btn:hover {
    background: var(--surface-hover);
    color: var(--ink-1);
  }

  .flavor-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--surface-sunk);
    border-radius: var(--r-md);
    padding: 4px;
  }

  .flavor-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 12px;
    border-radius: 7px;
    cursor: pointer;
    background: transparent;
    border: 0;
    font-family: inherit;
    font-size: 15px;
    color: var(--ink-1);
    text-align: left;
    width: 100%;
  }

  .flavor-row:hover {
    background: var(--surface-hover);
  }

  .flavor-row .swatch {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .flavor-row .name {
    flex: 1;
  }

  .flavor-row .pool {
    margin-left: auto;
    font-size: 11px;
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .empty {
    text-align: center;
    color: var(--ink-3);
    padding: 32px 12px;
  }

  /**
   * Laptop layout - the sheet becomes a fixed-width right side panel.
   * The backdrop hides because the side panel is always-visible when
   * open (no need to dim the rest).
   */
  @container app (min-width: 820px) {
    .sheet {
      left: auto;
      right: 0;
      top: 0;
      bottom: 0;
      width: 380px;
      max-height: 100%;
      border-radius: 0;
      border-left: 1px solid var(--line-1);
      transform: translateX(100%);
      transition: transform var(--transition-pop);
    }

    .sheet.open {
      transform: translateX(0);
    }

    .sheet-backdrop {
      display: none;
    }

    .grabber {
      display: none;
    }
  }
</style>
