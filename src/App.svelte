<script lang="ts">
  /**
   * App Root
   *
   * Wraps the svelte-spa-router outlet in a CSS-grid app shell driven by
   * container queries: bottom tab bar + stacked layout on phone widths,
   * left rail + topbar layout on laptop widths, with a single 820px
   * breakpoint expressed via @container app rules.
   *
   * A ResizeObserver mirrors the container width into an `isWide` $state
   * so structural switches that CSS alone can't make (FAB vs. topbar
   * button, sheet vs. side panel) can react to layout changes
   * synchronously without a first-paint flash.
   *
   * The topbar grid row collapses to 0px when nothing is rendered there;
   * screens that need a topbar action mount their own header from inside
   * .main rather than coupling here. Sheets and overlays mount as
   * siblings of .app-shell so their fixed/absolute positioning escapes
   * the grid.
   */

  import Router, { router } from 'svelte-spa-router';
  import { routes } from './lib/router/routes';
  import WelcomeModal from './lib/components/WelcomeModal.svelte';
  import AppNav from './lib/components/AppNav.svelte';
  import PickResultSheet from './lib/components/PickResultSheet.svelte';
  import AddInventoryPanel from './lib/components/AddInventoryPanel.svelte';
  import { addInventoryOpen } from './lib/panel-state';
  import ConflictResolutionModal from './lib/components/ConflictResolutionModal.svelte';
  import { initializeSync } from './lib/sync-coordinator';
  import { onMount } from 'svelte';

  /**
   * localStorage key for tracking whether welcome modal has been shown
   */
  const WELCOME_SHOWN_KEY = 'broteinbuddy_welcome_shown';

  /**
   * Wide-layout breakpoint in CSS pixels - mirrors --bp-app-wide and
   * the @container app (min-width: 820px) rules.
   */
  const WIDE_BREAKPOINT_PX = 820;

  /**
   * State for welcome modal visibility
   */
  let showWelcomeModal = $state(false);

  /**
   * Element ref for the .app container; observed for width changes.
   */
  let appEl = $state<HTMLDivElement | undefined>(undefined);

  /**
   * Whether the app container is currently wider than the laptop
   * breakpoint. Drives structural switches not handled by CSS alone
   * (FAB vs. topbar Add button, sheet vs. side panel) and is exposed as
   * a class hook on the .app element for cases where CSS needs to know
   * about the breakpoint without restating its own @container rule.
   */
  let isWide = $state(false);

  /**
   * Whether the current route is the Inventory list (not its deep
   * flows). The laptop topbar mounts a "+ Add inventory" CTA only on
   * this exact path so the topbar doesn't compete with deep-flow stage
   * headers.
   */
  const onInventoryList = $derived(router.location === '/inventory');

  /**
   * Map routes to page titles
   */
  const pageTitles: Record<string, string> = {
    '/': 'Pick a flavor',
    '/inventory': 'Inventory',
    '/inventory/rearrange': 'Rearrange Inventory',
    '/more': 'More',
  };

  /**
   * Check if this is the first visit and show welcome modal.
   * Also wires up the Supabase sync coordinator (no-op when not configured).
   */
  onMount(() => {
    const hasSeenWelcome = localStorage.getItem(WELCOME_SHOWN_KEY);
    if (!hasSeenWelcome) {
      showWelcomeModal = true;
    }
    initializeSync();
  });

  /**
   * Track container width via ResizeObserver. We seed isWide from
   * offsetWidth on mount so the very first paint already knows whether
   * to render structural-switch components in their wide form.
   */
  $effect(() => {
    if (!appEl) return;
    isWide = appEl.offsetWidth >= WIDE_BREAKPOINT_PX;
    const ro = new ResizeObserver(([entry]) => {
      isWide = entry.contentRect.width >= WIDE_BREAKPOINT_PX;
    });
    ro.observe(appEl);
    return () => ro.disconnect();
  });

  /**
   * Handle welcome modal close
   * Mark as shown in localStorage so it doesn't appear again
   */
  function handleWelcomeClose() {
    localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
    showWelcomeModal = false;
  }

  /**
   * Update page title whenever location changes
   * Falls back to route-specific titles for dynamic routes (e.g., /inventory/:boxId/edit)
   */
  $effect(() => {
    const currentPath = router.location;
    let title;

    // Check exact path match first
    if (currentPath in pageTitles) {
      title = `${pageTitles[currentPath]} - BroteinBuddy`;
    }
    // Check for dynamic routes (box edit)
    else if (currentPath.startsWith('/inventory/') && currentPath.endsWith('/edit')) {
      title = 'Edit Box - BroteinBuddy';
    }
    // Fallback for unmatched routes
    else {
      title = 'BroteinBuddy';
    }

    document.title = title;
  });
</script>

<!-- Skip to main content link (for keyboard navigation) -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<div class="app" class:is-wide={isWide} bind:this={appEl}>
  <div class="app-shell">
    {#if onInventoryList && isWide}
      <header class="topbar" data-testid="inventory-topbar">
        <h1>
          <span class="wordmark-dot" aria-hidden="true"></span>
          Inventory
        </h1>
        <button
          type="button"
          class="topbar-add"
          onclick={() => addInventoryOpen.set(true)}
          data-testid="topbar-add-inventory"
        >
          <span class="plus" aria-hidden="true">+</span> Add inventory
        </button>
      </header>
    {/if}

    <main id="main-content" class="main">
      <Router {routes} />
    </main>

    <AppNav />
  </div>

  <!--
    Sheets that overlay the whole app stage live here as siblings of
    .app-shell so their absolute-positioning escapes the layout grid
    and the closed-sheet's translate(100%) parks them off the visible
    viewport rather than at the top of the bottom tab bar.
  -->
  <PickResultSheet />
  <AddInventoryPanel />
</div>

<!-- Welcome Modal (first-time users) -->
<WelcomeModal open={showWelcomeModal} onclose={handleWelcomeClose} />

<!-- Sign-in conflict resolution. Modal opens itself when the coordinator
     surfaces a pending conflict; renders nothing otherwise. -->
<ConflictResolutionModal />

<style>
  /**
   * Skip-to-main-content link
   * Hidden by default, visible on keyboard focus
   */
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--accent);
    color: var(--surface-card);
    padding: var(--space-2) var(--space-4);
    text-decoration: none;
    font-weight: var(--font-weight-semibold);
    z-index: 100;
    border-radius: 0 0 var(--r-md) 0;
  }

  .skip-link:focus {
    top: 0;
  }

  /**
   * App container
   *
   * Establishes the container-query context the rest of the layout
   * (nav rail vs. tab bar, side panel vs. sheet, topbar vs. FAB) reacts
   * to. We deliberately use a *container* query rather than a media
   * query so the layout responds to its own width even when embedded
   * inside a fixed-size frame.
   */
  .app {
    container-type: inline-size;
    container-name: app;
    width: 100%;
    height: 100vh;
    background: var(--surface-app);
    color: var(--ink-1);
    font-family: var(--font-family-base);
    font-size: 15px;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
    position: relative;
  }

  .app :global(*) {
    box-sizing: border-box;
  }

  .app-shell {
    display: grid;
    grid-template-areas:
      'topbar'
      'main'
      'nav';
    grid-template-rows: auto 1fr auto;
    grid-template-columns: 1fr;
    height: 100%;
    width: 100%;
  }

  .main {
    grid-area: main;
    min-height: 0;
    overflow: hidden;
  }

  .topbar {
    grid-area: topbar;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 28px 16px;
    border-bottom: 1px solid var(--line-1);
    background: var(--surface-app);
    position: relative;
    z-index: 2;
  }

  .topbar h1 {
    font-size: 18px;
    font-weight: var(--font-weight-semibold);
    letter-spacing: -0.01em;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .topbar .wordmark-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--accent);
  }

  .topbar-add {
    appearance: none;
    border: 0;
    background: var(--ink-1);
    color: var(--surface-card);
    font-family: inherit;
    font-size: 14px;
    font-weight: var(--font-weight-semibold);
    padding: 10px 16px;
    border-radius: var(--r-md);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .topbar-add:hover {
    background: oklch(0.3 0.01 80);
  }

  .topbar-add .plus {
    font-size: 16px;
    line-height: 1;
    margin-top: -1px;
  }

  /**
   * Laptop layout (container >= 820px): nav becomes a left rail, topbar
   * stretches across the right column. Topbar grid row stays auto so
   * screens that don't render a topbar collapse it to 0px.
   */
  @container app (min-width: 820px) {
    .app-shell {
      grid-template-areas:
        'nav topbar'
        'nav main';
      grid-template-rows: auto 1fr;
      grid-template-columns: 72px 1fr;
    }
  }
</style>
