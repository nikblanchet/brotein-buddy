<script lang="ts">
  /**
   * App Root Component
   *
   * The root component acts as a routing container, delegating
   * all screen rendering to svelte-spa-router.
   *
   * Also manages:
   * - Dynamic page titles per route (for screen readers and browser tabs)
   * - Skip-to-main-content link (for keyboard navigation accessibility)
   *
   * Global styles are defined in app.css and imported in main.ts.
   */

  import Router, { location } from 'svelte-spa-router';
  import { routes } from './lib/router/routes';

  /**
   * Map routes to page titles
   */
  const pageTitles: Record<string, string> = {
    '/': 'Home',
    '/random': 'Random Selection',
    '/random/confirm': 'Confirm Selection',
    '/inventory': 'Inventory',
    '/inventory/rearrange': 'Rearrange Inventory',
  };

  /**
   * Update page title whenever location changes
   * Falls back to route-specific titles for dynamic routes (e.g., /inventory/:boxId/edit)
   */
  $effect(() => {
    const currentPath = $location;
    let title = 'BroteinBuddy';

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

<!-- Main content container -->
<main id="main-content">
  <Router {routes} />
</main>

<style>
  /**
   * Skip-to-main-content link
   * Hidden by default, visible on keyboard focus
   */
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    padding: var(--space-2) var(--space-4);
    text-decoration: none;
    font-weight: var(--font-weight-semibold);
    z-index: 100;
    border-radius: 0 0 var(--radius-base) 0;
  }

  .skip-link:focus {
    top: 0;
  }

  /**
   * Main content container
   * No visual styling - purely semantic
   */
  main {
    display: contents;
  }
</style>
