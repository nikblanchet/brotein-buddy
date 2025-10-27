/**
 * Core data models for BroteinBuddy application.
 *
 * These interfaces define the structure of the application's domain model,
 * including protein shake flavors, physical box inventory, and application state.
 *
 * @module types/models
 */

/**
 * Represents a 2D coordinate position in the physical storage system.
 *
 * Uses a stack-based coordinate system where:
 * - `stack`: Horizontal position (which column of boxes)
 * - `height`: Vertical position (how many boxes from the ground)
 *
 * @example
 * ```typescript
 * // Box on the ground in stack 1
 * const groundLevel: Location = { stack: 1, height: 0 };
 *
 * // Box on top of another box in stack 2
 * const elevated: Location = { stack: 2, height: 1 };
 * ```
 *
 * @remarks
 * - Stack and height are zero-indexed integers
 * - Stack numbers represent physical columns in storage
 * - Height 0 means on the ground, height 1 means one box up, etc.
 * - Negative values are not valid
 */
export interface Location {
  /** Horizontal stack position (0-indexed column number) */
  stack: number;

  /** Vertical position in stack (0 = ground level, 1 = one box up, etc.) */
  height: number;
}

/**
 * Represents a protein shake flavor that can be tracked in inventory.
 *
 * Flavors are the primary categorization for boxes. Each box contains
 * bottles of a single flavor.
 *
 * @example
 * ```typescript
 * const chocolateFlavor: Flavor = {
 *   id: 'flavor_001',
 *   name: 'Chocolate',
 *   excludeFromRandom: false
 * };
 *
 * // A flavor the user never wants randomly selected
 * const vanillaFlavor: Flavor = {
 *   id: 'flavor_002',
 *   name: 'Vanilla',
 *   excludeFromRandom: true
 * };
 * ```
 *
 * @remarks
 * - IDs should be unique across all flavors
 * - Name is user-facing and can be changed
 * - excludeFromRandom allows users to prevent certain flavors from
 *   appearing in random selection (e.g., flavors they're saving)
 */
export interface Flavor {
  /** Unique identifier for this flavor */
  id: string;

  /** User-facing display name of the flavor */
  name: string;

  /**
   * Whether to exclude this flavor from random selection algorithm.
   * Set to true for flavors the user wants to manually select only.
   */
  excludeFromRandom: boolean;
}

/**
 * Represents a physical box of protein shakes in inventory.
 *
 * Each box contains bottles of a single flavor and is stored at a specific
 * location. Boxes can be open (in use) or unopened.
 *
 * @example
 * ```typescript
 * const box: Box = {
 *   id: 'box_001',
 *   flavorId: 'flavor_chocolate',
 *   quantity: 12,
 *   location: { stack: 1, height: 0 },
 *   isOpen: false
 * };
 * ```
 *
 * @remarks
 * - IDs should be unique across all boxes
 * - flavorId must reference a valid Flavor.id
 * - quantity represents number of individual bottles remaining
 * - quantity should never be negative (minimum 0)
 * - Open boxes have priority in selection algorithm (use open before unopened)
 * - When quantity reaches 0, the box may be kept for tracking or deleted
 */
export interface Box {
  /** Unique identifier for this box */
  id: string;

  /** Reference to the Flavor.id this box contains */
  flavorId: string;

  /**
   * Number of individual bottles remaining in this box.
   * Must be >= 0. When this reaches 0, consider removing the box.
   */
  quantity: number;

  /** Physical storage location of this box */
  location: Location;

  /**
   * Whether this box has been opened.
   * Open boxes are prioritized in the selection algorithm to use them first.
   */
  isOpen: boolean;
}

/**
 * Application-wide settings and preferences.
 *
 * @remarks
 * This interface is intentionally minimal in v1. Future settings might include:
 * - Theme preferences
 * - Display options
 * - Notification preferences
 * - Default quantity values
 */
export interface Settings {
  /** Placeholder for future settings. Currently empty. */
  [key: string]: unknown;
}

/**
 * Complete application state containing all data.
 *
 * This is the root state object that gets persisted to LocalStorage
 * and drives the entire application UI.
 *
 * @example
 * ```typescript
 * const initialState: AppState = {
 *   boxes: [],
 *   flavors: [],
 *   favoriteFlavorId: null,
 *   settings: {}
 * };
 * ```
 *
 * @remarks
 * - This entire structure is persisted to LocalStorage as JSON
 * - Schema versioning should be added in the future for migrations
 * - All references between objects use IDs (normalized structure)
 * - favoriteFlavorId enables quick-pick functionality from home screen
 */
export interface AppState {
  /** All boxes in inventory, including empty boxes if kept for tracking */
  boxes: Box[];

  /** All flavors that have been added to the system */
  flavors: Flavor[];

  /**
   * ID of the user's favorite flavor for quick-pick button.
   * null if no favorite has been configured.
   */
  favoriteFlavorId: string | null;

  /** Application-wide settings and preferences */
  settings: Settings;
}
