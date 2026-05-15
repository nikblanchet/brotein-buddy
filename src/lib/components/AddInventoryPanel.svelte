<script lang="ts">
  /**
   * Add Inventory Panel
   *
   * Bottom sheet on phone (container < 820px), right side panel on
   * laptop (container >= 820px). Same component, layout swap via
   * @container queries; no React-prototype-style branching here.
   *
   * Three steps:
   *   1. Mode select - Closed boxes vs Open box.
   *   2. Detail - flavor list + NumberPad + LocationPicker, with the
   *      footer's confirm label dynamically reporting the impact
   *      (e.g. "Add 3 boxes - 36 bottles").
   *
   * Mounted as a sibling of .app-shell from App.svelte - that placement
   * lets the closed-state translateY(100%) park the sheet off the
   * viewport rather than at the top of the bottom tab bar (the React
   * prototype's "Critical layout note" in the handoff README).
   */

  import { appState, addBox } from '$lib/stores';
  import { addInventoryOpen } from '$lib/panel-state';
  import {
    buildClosedBoxes,
    buildOpenBox,
    validateAddInventoryInput,
  } from '$lib/utils/add-inventory-utils';
  import {
    formatLocation,
    getLocationConflict,
    suggestNextLocation,
  } from '$lib/utils/location-validation';
  import { getFlavorTone } from '$lib/utils/flavor-color';
  import NumberPad from './NumberPad.svelte';
  import LocationPicker from './LocationPicker.svelte';
  import type { Flavor, Location } from '../../types/models';

  type Step = 'mode' | 'closed' | 'open';

  /** Convenience reactive bindings for the global appState slices used by the form */
  const existingBoxes = $derived($appState.boxes);
  const flavors = $derived($appState.flavors);
  const suggested = $derived(suggestNextLocation(existingBoxes));

  let step = $state<Step>('mode');
  let selectedFlavorId = $state<string>('');
  let count = $state<number | null>(null);
  let locMode = $state<'auto' | 'pick'>('auto');
  let selectedSlot = $state<Location | null>(null);
  let validationError = $state<string | null>(null);

  /**
   * Reset internal state every time the panel transitions to open. We
   * watch $addInventoryOpen rather than a prop so the reset happens
   * even when the panel is mounted persistently at the app level.
   */
  $effect(() => {
    if ($addInventoryOpen) {
      step = 'mode';
      selectedFlavorId = '';
      count = null;
      locMode = 'auto';
      selectedSlot = null;
      validationError = null;
    }
  });

  /** Pre-select the first flavor when entering a detail step */
  $effect(() => {
    if ((step === 'closed' || step === 'open') && !selectedFlavorId && flavors.length > 0) {
      selectedFlavorId = flavors[0].id;
    }
  });

  function close() {
    addInventoryOpen.set(false);
  }

  function chooseLocMode(mode: 'auto' | 'pick') {
    locMode = mode;
    if (mode === 'pick' && !selectedSlot) {
      selectedSlot = suggested;
    }
  }

  function pickFlavor(flavor: Flavor) {
    selectedFlavorId = flavor.id;
    validationError = null;
  }

  function pickCount(value: number | 'keyboard') {
    if (value === 'keyboard') return;
    count = value;
    validationError = null;
  }

  /**
   * Resolve the location the new box(es) will land at:
   * - In auto mode, the suggested slot.
   * - In pick mode, the user's tapped slot, falling back to suggested.
   */
  function resolveLocation(): Location {
    if (locMode === 'pick' && selectedSlot) return selectedSlot;
    return suggested;
  }

  function handleConfirm() {
    if (step === 'mode') return;
    const mode = step;

    const error = validateAddInventoryInput(
      mode,
      selectedFlavorId,
      mode === 'closed' ? count : null,
      mode === 'open' ? count : null,
      flavors
    );
    if (error) {
      validationError = error;
      return;
    }

    const location = resolveLocation();

    // Defensive: the LocationPicker only exposes empty slots, but a
    // race or stale suggested-slot could still try to land on top of
    // an existing box. Bail out cleanly if so.
    const conflict = getLocationConflict(location.stack, location.height, existingBoxes);
    if (conflict) {
      validationError = `Location ${formatLocation(location.stack, location.height)} is already occupied.`;
      return;
    }

    if (mode === 'closed' && count !== null) {
      const boxes = buildClosedBoxes(selectedFlavorId, count, existingBoxes);
      // First box lands at the chosen slot; subsequent boxes stack
      // automatically on top via buildClosedBoxes when the chosen slot
      // matches the suggested one. When the user picks a different
      // slot, retarget the first box and let buildClosedBoxes's
      // accumulation rule continue from there.
      if (location.stack !== suggested.stack || location.height !== suggested.height) {
        boxes[0] = { ...boxes[0], location: { ...location } };
        for (let i = 1; i < boxes.length; i++) {
          boxes[i] = {
            ...boxes[i],
            location: { stack: location.stack, height: location.height + i },
          };
        }
      }
      for (const box of boxes) {
        addBox(box);
      }
    } else if (mode === 'open' && count !== null) {
      let box = buildOpenBox(selectedFlavorId, count, existingBoxes);
      if (location.stack !== suggested.stack || location.height !== suggested.height) {
        box = { ...box, location: { ...location } };
      }
      addBox(box);
    }

    close();
  }

  const confirmDisabled = $derived(!selectedFlavorId || count === null);

  const confirmLabel = $derived.by(() => {
    if (step === 'closed' && count !== null) {
      return `Add ${count} box${count !== 1 ? 'es' : ''} · ${count * 12} bottles`;
    }
    if (step === 'open' && count !== null) {
      return `Add open box (${count})`;
    }
    return 'Add';
  });

  function poolBadge(flavor: Flavor): string | null {
    if (flavor.randomPool === 'caffeinated') return 'Caff';
    if (flavor.randomPool === 'caffeine-free') return 'Decaf';
    return null;
  }
</script>

{#if $addInventoryOpen}
  <button
    type="button"
    class="sheet-backdrop"
    aria-label="Close add inventory"
    onclick={close}
    data-testid="add-inv-backdrop"
  ></button>
{/if}

<div
  class="sheet add-inv"
  class:open={$addInventoryOpen}
  role="dialog"
  aria-modal="true"
  aria-label="Add inventory"
  aria-hidden={!$addInventoryOpen}
  inert={!$addInventoryOpen}
  data-testid="add-inventory-panel"
>
  <div class="grabber" aria-hidden="true"></div>

  <div class="panel-head">
    <h2>
      {#if step === 'mode'}Add inventory
      {:else if step === 'closed'}New closed boxes
      {:else}New open box
      {/if}
    </h2>
    <button class="icon-btn" onclick={close} aria-label="Close" data-testid="add-inv-close">
      ✕
    </button>
  </div>

  <div class="panel-body">
    {#if step === 'mode'}
      <p class="field-hint" style="margin-top: -4px;">What are you adding?</p>
      <div class="mode-cards">
        <button
          class="mode-card"
          type="button"
          onclick={() => (step = 'closed')}
          data-testid="mode-closed"
        >
          <span class="mc-title">Closed boxes</span>
          <span class="mc-desc">Sealed boxes — 12 bottles each</span>
        </button>
        <button
          class="mode-card"
          type="button"
          onclick={() => (step = 'open')}
          data-testid="mode-open"
        >
          <span class="mc-title">Open box</span>
          <span class="mc-desc">Partially used box, custom bottle count</span>
        </button>
      </div>
    {:else}
      <div class="field">
        <span class="field-label">Flavor</span>
        {#if flavors.length === 0}
          <p class="field-hint">No flavors yet. Add one from Inventory.</p>
        {:else}
          <div class="flavor-list" role="radiogroup" aria-label="Flavor">
            {#each flavors as flavor (flavor.id)}
              {@const tone = getFlavorTone(flavor.id)}
              {@const badge = poolBadge(flavor)}
              <button
                type="button"
                class="flavor-row"
                aria-pressed={selectedFlavorId === flavor.id}
                onclick={() => pickFlavor(flavor)}
                data-testid="add-inv-flavor-{flavor.id}"
              >
                <span class="swatch" style="background: {tone.accent};" aria-hidden="true"></span>
                <span class="name">{flavor.name}</span>
                {#if badge}
                  <span class="pool">{badge}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="field">
        <span class="field-label" id="count-label">
          {step === 'closed' ? 'How many boxes? · 12 bottles each' : 'Bottles in the open box'}
        </span>
        <NumberPad
          value={count}
          min={1}
          max={step === 'closed' ? 3 : 12}
          onselect={pickCount}
          ariaLabelledBy="count-label"
        />
      </div>

      <div class="field">
        <LocationPicker
          boxes={existingBoxes}
          {flavors}
          mode={locMode}
          selected={selectedSlot}
          {suggested}
          onModeChange={chooseLocMode}
          onSelect={(loc) => (selectedSlot = loc)}
        />
        {#if step === 'closed' && count !== null && count > 1 && locMode === 'auto'}
          <p class="field-hint">
            Boxes 2–{count} will stack automatically above box 1.
          </p>
        {/if}
      </div>

      {#if validationError}
        <p class="error-message" role="alert">{validationError}</p>
      {/if}
    {/if}
  </div>

  <div class="panel-foot">
    {#if step !== 'mode'}
      <button
        class="btn btn-ghost"
        type="button"
        onclick={() => (step = 'mode')}
        data-testid="add-inv-back"
      >
        Back
      </button>
    {/if}
    <button class="btn btn-ghost" type="button" onclick={close}>Cancel</button>
    {#if step !== 'mode'}
      <button
        class="btn btn-primary"
        type="button"
        onclick={handleConfirm}
        disabled={confirmDisabled}
        data-testid="add-inv-confirm"
      >
        {confirmLabel}
      </button>
    {/if}
  </div>
</div>

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
    /*
     * The closed sheet stays in the DOM for the slide-out animation;
     * pointer-events: none keeps it from occluding the underlying
     * screen when it's off-viewport. .open re-enables the events.
     */
    pointer-events: none;
  }

  .sheet.open {
    transform: translateY(0);
    pointer-events: auto;
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
    font-weight: var(--font-weight-semibold);
    letter-spacing: -0.01em;
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

  .panel-body {
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 22px;
    flex: 1;
  }

  .panel-foot {
    padding: 14px 20px;
    border-top: 1px solid var(--line-1);
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .field {
    display: flex;
    flex-direction: column;
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

  .mode-cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .mode-card {
    appearance: none;
    border: 1px solid var(--line-2);
    background: var(--surface-card);
    border-radius: var(--r-md);
    padding: 14px 16px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mode-card:hover {
    border-color: var(--ink-2);
    background: var(--surface-hover);
  }

  .mc-title {
    font-size: 15px;
    font-weight: var(--font-weight-semibold);
    color: var(--ink-1);
  }

  .mc-desc {
    font-size: 13px;
    color: var(--ink-2);
  }

  .flavor-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--surface-sunk);
    border-radius: var(--r-md);
    padding: 4px;
    max-height: 180px;
    overflow-y: auto;
  }

  .flavor-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 7px;
    cursor: pointer;
    background: transparent;
    border: 0;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink-1);
    text-align: left;
    width: 100%;
  }

  .flavor-row:hover {
    background: var(--surface-hover);
  }

  .flavor-row[aria-pressed='true'] {
    background: var(--surface-card);
    font-weight: var(--font-weight-semibold);
    box-shadow: var(--shadow-1);
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

  .btn {
    appearance: none;
    border: 1px solid transparent;
    font-family: inherit;
    font-size: 14px;
    font-weight: var(--font-weight-medium);
    padding: 10px 16px;
    border-radius: var(--r-md);
    cursor: pointer;
    letter-spacing: -0.005em;
  }

  .btn-primary {
    background: var(--ink-1);
    color: var(--surface-card);
    font-weight: var(--font-weight-semibold);
  }

  .btn-primary:hover:not(:disabled) {
    background: oklch(0.3 0.01 80);
  }

  .btn-primary:disabled {
    background: var(--ink-4);
    cursor: not-allowed;
  }

  .btn-ghost {
    background: transparent;
    color: var(--ink-2);
  }

  .btn-ghost:hover {
    background: var(--surface-hover);
    color: var(--ink-1);
  }

  .error-message {
    color: var(--danger);
    font-size: 13px;
    margin: 0;
  }

  /**
   * Laptop: panel slides in from the right rather than up from the
   * bottom; backdrop hides since the panel sits beside (not over) the
   * inventory list.
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
