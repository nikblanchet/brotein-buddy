<script lang="ts">
  /**
   * Pick Result Sheet
   *
   * Bottom sheet that overlays the Pick screen after a pool/favorite/
   * manual pick. Renders the chosen flavor in its tone, the box's
   * physical location, the bottle count, and two actions:
   *  - Pick again: re-runs the pool (random flow only); records a
   *    rejection for the previous pick before re-rolling.
   *  - Taking it -1: decrements the box and records the shake_taken
   *    timeline event.
   *
   * Closing the sheet without committing records selection_cancelled.
   * The sheet is mounted as a sibling of .app-shell from App.svelte so
   * its absolute positioning escapes the layout grid and does not
   * overlap the persistent bottom tab bar.
   */

  import { pickResult, clearPickResult } from '$lib/pick-state';
  import {
    appState,
    recordShakeTaken,
    recordShakeRejected,
    recordSelectionCancelled,
  } from '$lib/stores';
  import { getFlavorTone } from '$lib/utils/flavor-color';
  import { selectRandomFlavor } from '$lib/random-selection';
  import { selectPriorityBox } from '$lib/box-selection';
  import { maybeGetFlavor } from '$lib/utils/flavor';

  /**
   * Render-time projection of pickResult into the box, flavor, and tone
   * used by the sheet body. Reactive on appState so a successful
   * "Taking it" decrements the bottle count visibly before the sheet
   * dismisses.
   */
  const projection = $derived.by(() => {
    const result = $pickResult;
    if (!result) return null;
    const box = $appState.boxes.find((b) => b.id === result.boxId);
    if (!box) return null;
    const flavor = maybeGetFlavor(result.flavorId, $appState.flavors);
    if (!flavor) return null;
    return { result, box, flavor, tone: getFlavorTone(flavor.id) };
  });

  /**
   * Re-runs the same pool that produced the current pick, after
   * recording the previous flavor as a rejection. Favorite and manual
   * flows have no pool to re-run, so the button is hidden in those
   * cases.
   */
  function handlePickAgain() {
    if (!projection || projection.result.method !== 'random' || !projection.result.pool) return;
    const previousFlavorId = projection.result.flavorId;
    const pool = projection.result.pool;
    recordShakeRejected({
      rejectedFlavorId: previousFlavorId,
      method: 'random',
      pool,
    });
    const nextFlavor = selectRandomFlavor($appState, pool, previousFlavorId);
    if (!nextFlavor) {
      // No alternative left in the pool - close the sheet so the user
      // sees the empty-pool state and can pick again later.
      clearPickResult();
      return;
    }
    const nextBox = selectPriorityBox($appState.boxes, nextFlavor.id);
    if (!nextBox) {
      clearPickResult();
      return;
    }
    pickResult.set({
      boxId: nextBox.id,
      flavorId: nextFlavor.id,
      method: 'random',
      pool,
    });
  }

  function handleTakeIt() {
    if (!projection) return;
    recordShakeTaken({
      boxId: projection.result.boxId,
      flavorId: projection.result.flavorId,
      method: projection.result.method,
      pool: projection.result.pool,
    });
    clearPickResult();
  }

  function handleDismiss() {
    if (!projection) return;
    recordSelectionCancelled({
      flavorId: projection.result.flavorId,
      method: projection.result.method,
      pool: projection.result.pool,
    });
    clearPickResult();
  }
</script>

{#if projection}
  <button
    type="button"
    class="sheet-backdrop"
    aria-label="Dismiss pick result"
    onclick={handleDismiss}
    data-testid="pick-result-backdrop"
  ></button>

  <div
    class="sheet result-sheet"
    class:open={projection !== null}
    role="dialog"
    aria-modal="true"
    aria-label="Your shake"
    data-testid="pick-result-sheet"
  >
    <div class="grabber" aria-hidden="true"></div>

    <div class="result-body">
      <p class="eyebrow">Your shake</p>
      <h2 class="result-flavor" style="color: {projection.tone.ink};">
        {projection.flavor.name}
      </h2>
      <div
        class="result-card"
        style="background: {projection.tone.fill}; border-color: {projection.tone
          .accent}; color: {projection.tone.ink};"
      >
        <span class="result-loc"
          >Stack {projection.box.location.stack} · Row {projection.box.location.height}</span
        >
        <span class="result-qty">
          {projection.box.quantity}
          <span class="result-qty-unit">bottles left in box</span>
        </span>
      </div>

      <div class="result-actions">
        {#if projection.result.method === 'random'}
          <button
            type="button"
            class="btn btn-ghost"
            onclick={handlePickAgain}
            data-testid="pick-again-btn"
          >
            Pick again
          </button>
        {/if}
        <button
          type="button"
          class="btn btn-primary"
          onclick={handleTakeIt}
          data-testid="taking-it-btn"
        >
          Taking it · −1
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
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

  .result-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px 20px 28px;
  }

  .eyebrow {
    font-size: 14px;
    color: var(--ink-3);
    margin: 0;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .result-flavor {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 4px;
    line-height: 1.1;
    text-wrap: balance;
  }

  .result-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 18px 18px;
    border-radius: var(--r-lg);
    border: 1px solid;
  }

  .result-loc {
    font-family: var(--font-family-mono);
    font-size: 13px;
    opacity: 0.75;
    letter-spacing: 0.04em;
  }

  .result-qty {
    font-size: 24px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }

  .result-qty-unit {
    font-size: 13px;
    font-weight: 500;
    opacity: 0.75;
    margin-left: 6px;
  }

  .result-actions {
    display: flex;
    gap: 10px;
    margin-top: 6px;
  }

  .btn {
    appearance: none;
    border: 1px solid transparent;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    padding: 12px 16px;
    border-radius: var(--r-md);
    cursor: pointer;
    flex: 1;
    text-align: center;
    letter-spacing: -0.005em;
  }

  .btn-primary {
    background: var(--ink-1);
    color: var(--surface-card);
    font-weight: 600;
  }

  .btn-primary:hover {
    background: oklch(0.3 0.01 80);
  }

  .btn-ghost {
    background: transparent;
    color: var(--ink-2);
  }

  .btn-ghost:hover {
    background: var(--surface-hover);
    color: var(--ink-1);
  }

  /**
   * Laptop layout - the sheet becomes a centered modal-style card so
   * users on a wide window get a contained result, not a full-width
   * bottom sheet.
   */
  @container app (min-width: 820px) {
    .sheet {
      left: 50%;
      right: auto;
      bottom: 32px;
      width: 480px;
      max-width: calc(100% - 64px);
      transform: translate(-50%, calc(100% + 32px));
      border-radius: 18px;
      max-height: 80vh;
    }

    .sheet.open {
      transform: translate(-50%, 0);
    }

    .grabber {
      display: none;
    }
  }
</style>
