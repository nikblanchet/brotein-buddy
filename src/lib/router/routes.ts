/**
 * Route definitions for BroteinBuddy
 *
 * Using svelte-spa-router for client-side routing with hash-based navigation.
 * Hash routing is ideal for static PWA deployment without server configuration.
 *
 * @see ADR-006 for routing strategy decision rationale
 */

import Home from '../../routes/Home.svelte';
import Random from '../../routes/Random.svelte';
import RandomConfirm from '../../routes/RandomConfirm.svelte';
import Inventory from '../../routes/Inventory.svelte';
import InventoryBoxEdit from '../../routes/InventoryBoxEdit.svelte';
import InventoryRearrange from '../../routes/InventoryRearrange.svelte';
import NotFound from '../../routes/NotFound.svelte';

/**
 * Route configuration for svelte-spa-router
 *
 * Routes are matched in order, with '*' as the catch-all 404 handler.
 * All routes use hash-based navigation (e.g., /#/inventory).
 */
export const routes = {
  '/': Home,
  '/random': Random,
  '/random/confirm': RandomConfirm,
  '/inventory': Inventory,
  '/inventory/:boxId/edit': InventoryBoxEdit,
  '/inventory/rearrange': InventoryRearrange,
  '*': NotFound,
};

/**
 * Type-safe route constants for navigation
 *
 * Use these constants instead of hardcoding route strings to catch
 * typos at compile time and enable refactoring.
 *
 * @example
 * ```typescript
 * import { push } from 'svelte-spa-router';
 * import { ROUTES } from '$lib/router/routes';
 *
 * // Navigate to inventory
 * push(ROUTES.INVENTORY);
 *
 * // Navigate to box edit with parameter
 * push(ROUTES.INVENTORY_BOX_EDIT('box-123'));
 * ```
 */
export const ROUTES = {
  /** Home screen with main action buttons */
  HOME: '/',

  /** Random flavor selection screen */
  RANDOM: '/random',

  /** Confirmation screen after random selection */
  RANDOM_CONFIRM: '/random/confirm',

  /** Inventory management screen (visual and table views) */
  INVENTORY: '/inventory',

  /**
   * Individual box edit screen
   *
   * @param boxId - The unique identifier of the box to edit
   * @returns Route string with boxId parameter
   *
   * @example
   * ```typescript
   * push(ROUTES.INVENTORY_BOX_EDIT('box-550e8400'));
   * // Navigates to: /#/inventory/box-550e8400/edit
   * ```
   */
  INVENTORY_BOX_EDIT: (boxId: string): string => `/inventory/${boxId}/edit`,

  /** Drag-and-drop box rearrangement screen */
  INVENTORY_REARRANGE: '/inventory/rearrange',
} as const;

/**
 * Type for route parameters extracted from parameterized routes
 */
export interface RouteParams {
  /** Parameters for the inventory box edit route */
  inventoryBoxEdit: {
    boxId: string;
  };
}
