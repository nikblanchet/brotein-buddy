<script lang="ts">
  /**
   * Pick
   *
   * Default landing screen. Two big tap targets pick a flavor from a
   * pool with weighted-random selection; a Set Favorite pill captures or
   * runs a one-tap favorite pick; a small link below opens a flavor
   * picker for manual selection. Picks resolve into the result sheet
   * mounted alongside this screen by App.svelte.
   *
   * Replaces the previous Home + Random + RandomConfirm three-route
   * flow. The result sheet, flavor-picker sheet, and PickResultSheet
   * mount at the App.svelte level so their absolute-positioned overlays
   * escape the layout grid and do not overlap the persistent tab bar.
   */

  import { appState, setFavoriteFlavor } from '$lib/stores';
  import { selectRandomFlavor } from '$lib/random-selection';
  import { selectPriorityBox } from '$lib/box-selection';
  import { pickResult } from '$lib/pick-state';
  import { maybeGetFlavor } from '$lib/utils/flavor';
  import FlavorPickerSheet from '$lib/components/FlavorPickerSheet.svelte';
  import type { RandomPool } from '../types/models';
  import type { Flavor } from '../types/models';

  /**
   * Which flavor-picker mode is currently presented, or null if closed.
   * - 'set-favorite': user tapped the Set Favorite pill while no
   *   favorite was set; selection writes favoriteFlavorId.
   * - 'manual-pick': user tapped "Or choose a specific flavor"; selection
   *   runs the manual pick flow and shows the result sheet.
   */
  let pickerMode = $state<'set-favorite' | 'manual-pick' | null>(null);

  /**
   * In-stock bottle counts per pool, used both to render the pool
   * subline and to disable empty pool buttons.
   */
  const stockByPool = $derived.by(() => {
    const counts: Record<RandomPool, number> = {
      caffeinated: 0,
      'caffeine-free': 0,
    };
    for (const box of $appState.boxes) {
      if (box.quantity <= 0) continue;
      const flavor = $appState.flavors.find((f) => f.id === box.flavorId);
      if (!flavor || !flavor.randomPool) continue;
      counts[flavor.randomPool] += box.quantity;
    }
    return counts;
  });

  /**
   * Resolved favorite flavor (or null if unset/not found in inventory).
   */
  const favoriteFlavor = $derived(maybeGetFlavor($appState.favoriteFlavorId, $appState.flavors));

  /**
   * Picker sheet's title and the flavors it should list.
   * Manual pick excludes flavors with no in-stock boxes; setting a
   * favorite shows every flavor since the user might want to favorite
   * something they intend to restock.
   */
  const pickerProps = $derived.by(() => {
    if (pickerMode === null) return { title: '', flavors: [] as Flavor[] };
    if (pickerMode === 'set-favorite') {
      return { title: 'Set a favorite', flavors: $appState.flavors };
    }
    const inStock = new Set($appState.boxes.filter((b) => b.quantity > 0).map((b) => b.flavorId));
    return {
      title: 'Pick a specific flavor',
      flavors: $appState.flavors.filter((f) => inStock.has(f.id)),
    };
  });

  /**
   * Run a weighted random pick within a pool, then resolve the chosen
   * flavor's priority box, and surface the result sheet by writing to
   * pickResult. No-op if the pool has nothing in stock (the button is
   * also disabled in that case).
   */
  function pickFromPool(pool: RandomPool) {
    const flavor = selectRandomFlavor($appState, pool);
    if (!flavor) return;
    const box = selectPriorityBox($appState.boxes, flavor.id);
    if (!box) return;
    pickResult.set({
      boxId: box.id,
      flavorId: flavor.id,
      method: 'random',
      pool,
    });
  }

  /**
   * One-tap pick using the configured favorite flavor. No-op if the
   * favorite has been removed from inventory or has no in-stock boxes.
   */
  function pickFavorite() {
    if (!favoriteFlavor) return;
    const box = selectPriorityBox($appState.boxes, favoriteFlavor.id);
    if (!box) return;
    pickResult.set({
      boxId: box.id,
      flavorId: favoriteFlavor.id,
      method: 'favorite',
      pool: null,
    });
  }

  /**
   * Tap handler for the Set Favorite pill. With no favorite set, opens
   * the picker so the user can choose one. With a favorite set, runs
   * the one-tap favorite pick (matches the user-confirmed wired-up
   * behavior).
   */
  function handleFavoritePill() {
    if (!favoriteFlavor) {
      pickerMode = 'set-favorite';
      return;
    }
    pickFavorite();
  }

  /**
   * Picker callback dispatching on the mode that opened the sheet.
   */
  function handlePickerSelect(flavor: Flavor) {
    if (pickerMode === 'set-favorite') {
      setFavoriteFlavor(flavor.id);
      pickerMode = null;
      return;
    }
    if (pickerMode === 'manual-pick') {
      const box = selectPriorityBox($appState.boxes, flavor.id);
      pickerMode = null;
      if (!box) return;
      pickResult.set({
        boxId: box.id,
        flavorId: flavor.id,
        method: 'manual',
        pool: null,
      });
    }
  }
</script>

<section class="pick" data-testid="pick-screen">
  <div class="pick-greeting">
    <p class="eyebrow">Time for a shake</p>
    <h1>Pick a flavor</h1>
  </div>

  <div class="pool-buttons">
    <button
      type="button"
      class="pool-btn caff"
      onclick={() => pickFromPool('caffeinated')}
      disabled={stockByPool.caffeinated === 0}
      data-testid="pool-caff-btn"
      aria-label="Pick a caffeinated flavor"
    >
      <span class="pool-glyph" aria-hidden="true">⚡</span>
      <span class="pool-label">
        <span class="pool-name">Caffeinated</span>
        <span class="pool-sub">{stockByPool.caffeinated} bottles in pool</span>
      </span>
      <span class="pool-arrow" aria-hidden="true">›</span>
    </button>

    <button
      type="button"
      class="pool-btn decaf"
      onclick={() => pickFromPool('caffeine-free')}
      disabled={stockByPool['caffeine-free'] === 0}
      data-testid="pool-decaf-btn"
      aria-label="Pick a caffeine-free flavor"
    >
      <span class="pool-glyph" aria-hidden="true">💪</span>
      <span class="pool-label">
        <span class="pool-name">Caffeine-free</span>
        <span class="pool-sub">{stockByPool['caffeine-free']} bottles in pool</span>
      </span>
      <span class="pool-arrow" aria-hidden="true">›</span>
    </button>
  </div>

  <div class="pick-secondary">
    <button
      type="button"
      class="fav-btn"
      data-unset={!favoriteFlavor}
      onclick={handleFavoritePill}
      data-testid="favorite-pill"
    >
      <span class="fav-heart" aria-hidden="true">{favoriteFlavor ? '❤' : '♡'}</span>
      <span class="fav-label">
        {favoriteFlavor ? favoriteFlavor.name : 'Set a favorite for one-tap picks'}
      </span>
      <span class="fav-arrow" aria-hidden="true">›</span>
    </button>
    <button
      type="button"
      class="choose-link"
      onclick={() => (pickerMode = 'manual-pick')}
      data-testid="choose-specific-link"
    >
      Or choose a specific flavor →
    </button>
  </div>
</section>

<FlavorPickerSheet
  open={pickerMode !== null}
  title={pickerProps.title}
  flavors={pickerProps.flavors}
  onselect={handlePickerSelect}
  onclose={() => (pickerMode = null)}
/>

<style>
  .pick {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 24px 20px 32px;
    gap: 18px;
    overflow-y: auto;
  }

  @container app (min-width: 820px) {
    .pick {
      padding: 48px;
      max-width: 720px;
      margin: 0 auto;
      gap: 28px;
    }
  }

  .eyebrow {
    font-size: 14px;
    color: var(--ink-2);
    margin: 0;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .pick-greeting h1 {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--ink-1);
    margin: 0;
  }

  @container app (min-width: 820px) {
    .pick-greeting h1 {
      font-size: 36px;
    }
  }

  .pool-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 4px;
  }

  @container app (min-width: 820px) {
    .pool-buttons {
      gap: 16px;
    }
  }

  .pool-btn {
    appearance: none;
    border: 1px solid var(--pool-line, var(--line-2));
    background: var(--pool-bg, var(--surface-card));
    color: var(--pool-ink, var(--ink-1));
    font-family: inherit;
    text-align: left;
    padding: 22px 22px;
    border-radius: var(--r-lg);
    cursor: pointer;
    display: grid;
    grid-template-columns: 56px 1fr auto;
    align-items: center;
    gap: 16px;
    position: relative;
    transition:
      transform 120ms ease,
      box-shadow 120ms ease;
  }

  .pool-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-2);
  }

  .pool-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .pool-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .pool-btn .pool-glyph {
    font-size: 32px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--pool-glyph-bg, var(--surface-sunk));
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pool-btn .pool-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .pool-btn .pool-name {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.015em;
  }

  .pool-btn .pool-sub {
    font-size: 13px;
    color: var(--pool-ink-soft, var(--ink-3));
    font-variant-numeric: tabular-nums;
  }

  .pool-btn .pool-arrow {
    font-size: 28px;
    font-weight: 300;
    color: var(--pool-ink-soft, var(--ink-3));
    line-height: 1;
  }

  @container app (min-width: 820px) {
    .pool-btn {
      padding: 28px;
      gap: 22px;
    }
    .pool-btn .pool-name {
      font-size: 26px;
    }
    .pool-btn .pool-glyph {
      width: 64px;
      height: 64px;
      font-size: 36px;
    }
  }

  .pool-btn.caff {
    --pool-bg: var(--pool-caff-bg);
    --pool-line: var(--pool-caff-line);
    --pool-glyph-bg: var(--pool-caff-glyph-bg);
    --pool-ink: var(--pool-caff-ink);
    --pool-ink-soft: var(--pool-caff-ink-soft);
  }

  .pool-btn.decaf {
    --pool-bg: var(--pool-decaf-bg);
    --pool-line: var(--pool-decaf-line);
    --pool-glyph-bg: var(--pool-decaf-glyph-bg);
    --pool-ink: var(--pool-decaf-ink);
    --pool-ink-soft: var(--pool-decaf-ink-soft);
  }

  .pick-secondary {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }

  .fav-btn {
    appearance: none;
    border: 1px solid var(--line-2);
    background: var(--surface-card);
    color: var(--ink-1);
    font-family: inherit;
    font-size: 15px;
    font-weight: 500;
    padding: 14px 18px;
    border-radius: var(--r-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
  }

  .fav-btn .fav-heart {
    font-size: 16px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--surface-sunk);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fav-btn:hover {
    background: var(--surface-hover);
  }

  .fav-btn .fav-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fav-btn .fav-arrow {
    color: var(--ink-3);
  }

  .fav-btn[data-unset='true'] {
    color: var(--ink-2);
    border-style: dashed;
  }

  .choose-link {
    appearance: none;
    border: 0;
    background: transparent;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink-2);
    padding: 10px 4px;
    cursor: pointer;
    text-align: center;
    text-decoration: underline;
    text-decoration-color: var(--line-2);
    text-underline-offset: 4px;
    align-self: center;
  }

  .choose-link:hover {
    color: var(--ink-1);
  }
</style>
