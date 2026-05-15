/**
 * UI-state store for the Sync & Account sheet.
 *
 * The Sync sheet mounts at the App level (sibling of .app-shell) so its
 * absolute positioning escapes the layout grid. Both triggers - the
 * More screen's "Sync & sign-in" row and the topbar SyncStatusBadge -
 * communicate "open" through this shared writable rather than through a
 * prop-drilling path down App.svelte.
 *
 * NOT persisted to localStorage; closing the page closes the sheet.
 *
 * @module lib/sync-ui-state
 */

import { writable } from 'svelte/store';

/**
 * Whether the Sync & Account sheet is currently open. Set to true to
 * open it, false to dismiss. The sheet resets its transient send-link
 * state on close.
 */
export const syncSheetOpen = writable<boolean>(false);
