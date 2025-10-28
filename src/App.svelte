<script lang="ts">
  /**
   * App Root Component
   *
   * The root component acts as a routing container, delegating
   * all screen rendering to svelte-spa-router.
   *
   * Global styles are defined in app.css and imported in main.ts.
   */

  import Router from 'svelte-spa-router';
  import { routes } from './lib/router/routes';
</script>

<Router {routes} />
