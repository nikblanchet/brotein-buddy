<script lang="ts">
  /**
   * App Nav
   *
   * Persistent three-tab navigation rendered as a bottom tab bar on phone
   * widths (container < 820px) and a left rail on laptop widths
   * (container >= 820px). Visible across every screen including deep flows
   * (Box Edit) so users always have an escape hatch back to a top-level tab.
   *
   * Active state is derived from the current router location, not held
   * locally - the URL is the single source of truth and back/forward buttons
   * keep the highlight in sync automatically.
   */

  import { push, location } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';

  type Tab = 'pick' | 'inventory' | 'more';

  /**
   * Map a router location string to its top-level tab, falling back to
   * 'pick' for unknown paths so the user is never left with no
   * highlighted tab.
   */
  function deriveTab(path: string): Tab {
    if (path.startsWith('/inventory')) return 'inventory';
    if (path.startsWith('/more')) return 'more';
    return 'pick';
  }

  const activeTab = $derived(deriveTab($location));

  function go(tab: Tab) {
    if (tab === 'pick') push(ROUTES.PICK);
    else if (tab === 'inventory') push(ROUTES.INVENTORY);
    else push(ROUTES.MORE);
  }
</script>

<nav class="nav" aria-label="Primary">
  <button
    type="button"
    class="nav-item"
    aria-current={activeTab === 'pick' ? 'page' : undefined}
    onclick={() => go('pick')}
    data-testid="nav-pick"
  >
    <span class="nav-glyph" aria-hidden="true">🎲</span>
    Pick
  </button>
  <button
    type="button"
    class="nav-item"
    aria-current={activeTab === 'inventory' ? 'page' : undefined}
    onclick={() => go('inventory')}
    data-testid="nav-inventory"
  >
    <span class="nav-glyph" aria-hidden="true">📦</span>
    Inventory
  </button>
  <button
    type="button"
    class="nav-item"
    aria-current={activeTab === 'more' ? 'page' : undefined}
    onclick={() => go('more')}
    data-testid="nav-more"
  >
    <span class="nav-glyph" aria-hidden="true">⋯</span>
    More
  </button>
</nav>

<style>
  .nav {
    grid-area: nav;
    display: flex;
    align-items: stretch;
    background: oklch(0.92 0.015 80);
    border-top: 1px solid oklch(0.82 0.018 80);
    box-shadow: 0 -2px 8px oklch(0 0 0 / 0.035);
    z-index: 4;
  }

  .nav-item {
    appearance: none;
    border: 0;
    background: transparent;
    font-family: inherit;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 8px 4px 10px;
    color: var(--ink-3);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.01em;
    cursor: pointer;
    position: relative;
  }

  .nav-glyph {
    font-size: 22px;
    line-height: 1;
    transition: transform 120ms ease;
  }

  .nav-item:hover {
    color: var(--ink-1);
  }

  .nav-item[aria-current='page'] {
    color: var(--ink-1);
    font-weight: 600;
  }

  .nav-item[aria-current='page'] .nav-glyph {
    transform: scale(1.06);
  }

  .nav-item[aria-current='page']::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 28px;
    height: 2px;
    background: var(--ink-1);
    border-radius: 0 0 2px 2px;
  }

  /**
   * Laptop (container >= 820px): left rail
   *
   * The same .nav element is repurposed as a vertical rail with the
   * active-state indicator becoming a 3x28px bar on the left edge.
   * Container queries (not media queries) are intentional - the app may
   * eventually be embedded inside a fixed-size frame and we want the
   * layout to respond to its own container, not the viewport.
   */
  @container app (min-width: 820px) {
    .nav {
      flex-direction: column;
      border-top: 0;
      border-right: 1px solid var(--line-1);
      padding: 12px 0;
      gap: 4px;
      background: var(--surface-app);
      box-shadow: none;
    }

    .nav-item {
      flex: 0 0 auto;
      padding: 12px 4px;
      font-size: 10px;
      gap: 4px;
    }

    .nav-glyph {
      font-size: 20px;
    }

    .nav-item[aria-current='page']::before {
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      width: 3px;
      height: 28px;
      border-radius: 0 2px 2px 0;
    }
  }
</style>
