/**
 * Panel-state store for the Add Inventory sheet/panel.
 *
 * The Add Inventory UI mounts at the App level (sibling of .app-shell)
 * so its absolute positioning escapes the layout grid - that means the
 * trigger (the Inventory route's FAB or the laptop topbar's Add
 * button) has to communicate "open" through a shared writable rather
 * than via local component state.
 *
 * Kept tiny and focused on the open/closed bit so route components
 * don't grow a new prop drilling path through App.svelte just to wire
 * the trigger to the panel.
 *
 * NOT persisted to localStorage; closing the page closes the panel.
 *
 * @module lib/panel-state
 */

import { writable } from 'svelte/store';

/**
 * Whether the Add Inventory panel/sheet is currently open. Set to true
 * to open the panel, false to dismiss. The panel itself handles
 * resetting its internal step/flavor state on open.
 */
export const addInventoryOpen = writable<boolean>(false);
