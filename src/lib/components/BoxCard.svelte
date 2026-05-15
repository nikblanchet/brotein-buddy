<script lang="ts">
  /**
   * Box Card
   *
   * Square (`aspect-ratio: 1/1`) flavored card representing one box of
   * shakes. Composes the flavor's tone (fill / accent / ink) into a
   * coherent surface: tinted background, left accent strip, ink-toned
   * type. Container-query typography keeps the qty and name legible
   * even when the card squeezes into a narrow 3-per-row grid on phone.
   *
   * Tap target is the whole card, rendered as a real <button> when an
   * onclick handler is provided so screen readers announce it as
   * activatable. The OPEN tag appears for in-progress boxes; the
   * container-query layer hides the tag when the card gets very narrow
   * to avoid wrapping.
   */

  import { getFlavorTone } from '$lib/utils/flavor-color';
  import type { Box, Flavor } from '../../types/models';

  interface Props {
    box: Box;
    flavor: Flavor | null;
    /**
     * Tap handler. When omitted the card renders as a static <div>
     * (e.g. read-only previews); when provided it renders as a
     * <button>.
     */
    onclick?: () => void;
  }

  const { box, flavor, onclick }: Props = $props();

  const tone = $derived(getFlavorTone(box.flavorId));
</script>

{#if onclick}
  <button
    type="button"
    class="box"
    style="--box-fill: {tone.fill}; --box-accent: {tone.accent}; --box-ink: {tone.ink};"
    {onclick}
    data-testid="box-{box.id}"
    aria-label={`Edit ${flavor?.name ?? 'unknown'} box, ${box.quantity} bottles`}
  >
    <span class="accent-strip" aria-hidden="true"></span>
    <span class="box-name">{flavor?.name ?? 'Unknown'}</span>
    <span class="box-footer">
      <span>
        <span class="box-qty">{box.quantity}</span><span class="box-qty-unit">btl</span>
      </span>
      {#if box.isOpen}
        <span class="box-tag">Open</span>
      {/if}
    </span>
  </button>
{:else}
  <div
    class="box"
    style="--box-fill: {tone.fill}; --box-accent: {tone.accent}; --box-ink: {tone.ink};"
    data-testid="box-{box.id}"
  >
    <span class="accent-strip" aria-hidden="true"></span>
    <span class="box-name">{flavor?.name ?? 'Unknown'}</span>
    <span class="box-footer">
      <span>
        <span class="box-qty">{box.quantity}</span><span class="box-qty-unit">btl</span>
      </span>
      {#if box.isOpen}
        <span class="box-tag">Open</span>
      {/if}
    </span>
  </div>
{/if}

<style>
  .box {
    position: relative;
    aspect-ratio: 1 / 1;
    border-radius: var(--r-md);
    background: var(--box-fill, var(--surface-card));
    color: var(--box-ink, var(--ink-1));
    border: 1px solid var(--line-2);
    padding: 9px 10px 9px 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    transition:
      transform 120ms ease,
      box-shadow 120ms ease;
    container-type: inline-size;
    font-family: inherit;
    text-align: left;
    appearance: none;
    width: 100%;
  }

  .box:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-2);
  }

  .box:active {
    transform: translateY(0);
  }

  .accent-strip {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--box-accent, var(--ink-3));
    border-top-left-radius: var(--r-md);
    border-bottom-left-radius: var(--r-md);
  }

  .box-name {
    font-size: 13px;
    font-weight: var(--font-weight-semibold);
    line-height: 1.2;
    letter-spacing: -0.005em;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    text-wrap: balance;
    padding-left: 4px;
  }

  .box-footer {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 6px;
    padding-left: 4px;
  }

  .box-qty {
    font-size: 22px;
    font-weight: var(--font-weight-semibold);
    font-variant-numeric: tabular-nums;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .box-qty-unit {
    font-size: 10px;
    font-weight: var(--font-weight-medium);
    color: var(--box-accent, var(--ink-3));
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-left: 1px;
  }

  .box-tag {
    font-size: 9.5px;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 6px;
    border-radius: 4px;
    background: oklch(1 0 0 / 0.5);
    color: var(--box-accent, var(--ink-2));
  }

  /**
   * Container-query font scaling. The 3-per-row inventory grid squeezes
   * each box card down on a phone (~108px wide on a 390px viewport
   * minus padding); without these size drops the qty number wraps and
   * the OPEN tag overflows. Sizes mirror the React prototype's
   * breakpoints.
   */
  @container (max-width: 130px) {
    .box-qty {
      font-size: 18px;
    }
    .box-name {
      font-size: 12px;
    }
  }

  @container (max-width: 110px) {
    .box-qty {
      font-size: 16px;
    }
    .box-name {
      font-size: 11px;
      -webkit-line-clamp: 1;
      line-clamp: 1;
    }
    .box-tag {
      display: none;
    }
  }
</style>
