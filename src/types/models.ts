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
 * @example
 * ```typescript
 * // v1: Empty settings object
 * const currentSettings: Settings = {};
 *
 * // Future v2 might include:
 * const futureSettings: Settings = {
 *   theme: 'dark',
 *   defaultBoxQuantity: 12,
 *   enableNotifications: true,
 *   sortBoxesBy: 'flavor'
 * };
 * ```
 *
 * @remarks
 * This interface is intentionally minimal in v1. Future settings might include:
 * - Theme preferences (light/dark/auto)
 * - Display options (sort order, view mode)
 * - Notification preferences (low stock alerts)
 * - Default quantity values for new boxes
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
 *   version: 1,
 *   boxes: [],
 *   flavors: [],
 *   favoriteFlavorId: null,
 *   settings: {}
 * };
 * ```
 *
 * @remarks
 * - This entire structure is persisted to LocalStorage as JSON
 * - Schema version enables graceful migrations when structure changes
 * - All references between objects use IDs (normalized structure)
 * - favoriteFlavorId enables quick-pick functionality from home screen
 * - Current version is 1 (initial schema)
 */
export interface AppState {
  /**
   * Schema version number for migration support.
   * Increment when making breaking changes to the data structure.
   * Current version: 1
   */
  version: number;

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

/**
 * Type guard to check if a value is a valid Location.
 *
 * @param value - The value to check
 * @returns true if value is a valid Location
 *
 * @example
 * ```typescript
 * // Valid locations
 * isLocation({ stack: 0, height: 0 }); // true
 * isLocation({ stack: 5, height: 2 }); // true
 *
 * // Invalid locations
 * isLocation({ stack: -1, height: 0 }); // false (negative)
 * isLocation({ stack: 1.5, height: 0 }); // false (non-integer)
 * isLocation({ stack: 0 }); // false (missing height)
 * isLocation(null); // false
 *
 * // Usage with LocalStorage
 * const data = JSON.parse(localStorage.getItem('location'));
 * if (isLocation(data)) {
 *   // TypeScript knows data is a Location here
 *   console.log(data.stack, data.height);
 * }
 * ```
 */
export function isLocation(value: unknown): value is Location {
  return (
    typeof value === 'object' &&
    value !== null &&
    'stack' in value &&
    'height' in value &&
    typeof (value as Location).stack === 'number' &&
    typeof (value as Location).height === 'number' &&
    (value as Location).stack >= 0 &&
    (value as Location).height >= 0 &&
    Number.isInteger((value as Location).stack) &&
    Number.isInteger((value as Location).height)
  );
}

/**
 * Type guard to check if a value is a valid Flavor.
 *
 * @param value - The value to check
 * @returns true if value is a valid Flavor
 *
 * @example
 * ```typescript
 * // Valid flavors
 * isFlavor({ id: 'f1', name: 'Chocolate', excludeFromRandom: false }); // true
 * isFlavor({ id: 'f2', name: 'Vanilla', excludeFromRandom: true }); // true
 *
 * // Invalid flavors
 * isFlavor({ id: '', name: 'Chocolate', excludeFromRandom: false }); // false (empty id)
 * isFlavor({ id: 'f1', name: '', excludeFromRandom: false }); // false (empty name)
 * isFlavor({ id: 'f1', name: 'Chocolate' }); // false (missing excludeFromRandom)
 * isFlavor({ id: 'f1', name: 'Chocolate', excludeFromRandom: 'false' }); // false (wrong type)
 * ```
 */
export function isFlavor(value: unknown): value is Flavor {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'excludeFromRandom' in value &&
    typeof (value as Flavor).id === 'string' &&
    typeof (value as Flavor).name === 'string' &&
    typeof (value as Flavor).excludeFromRandom === 'boolean' &&
    (value as Flavor).id.length > 0 &&
    (value as Flavor).name.length > 0
  );
}

/**
 * Type guard to check if a value is a valid Box.
 *
 * @param value - The value to check
 * @returns true if value is a valid Box
 *
 * @example
 * ```typescript
 * // Valid boxes
 * isBox({
 *   id: 'b1',
 *   flavorId: 'f1',
 *   quantity: 12,
 *   location: { stack: 0, height: 0 },
 *   isOpen: false
 * }); // true
 *
 * isBox({
 *   id: 'b2',
 *   flavorId: 'f2',
 *   quantity: 0,
 *   location: { stack: 1, height: 2 },
 *   isOpen: true
 * }); // true
 *
 * // Invalid boxes
 * isBox({ id: '', flavorId: 'f1', quantity: 12, location: {...}, isOpen: false }); // false (empty id)
 * isBox({ id: 'b1', flavorId: 'f1', quantity: -1, location: {...}, isOpen: false }); // false (negative quantity)
 * isBox({ id: 'b1', flavorId: 'f1', quantity: 12.5, location: {...}, isOpen: false }); // false (non-integer)
 * isBox({ id: 'b1', flavorId: 'f1', quantity: 12, location: { stack: -1, height: 0 }, isOpen: false }); // false (invalid location)
 * ```
 */
export function isBox(value: unknown): value is Box {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'flavorId' in value &&
    'quantity' in value &&
    'location' in value &&
    'isOpen' in value &&
    typeof (value as Box).id === 'string' &&
    typeof (value as Box).flavorId === 'string' &&
    typeof (value as Box).quantity === 'number' &&
    typeof (value as Box).isOpen === 'boolean' &&
    (value as Box).id.length > 0 &&
    (value as Box).flavorId.length > 0 &&
    (value as Box).quantity >= 0 &&
    Number.isInteger((value as Box).quantity) &&
    isLocation((value as Box).location)
  );
}

/**
 * Type guard to check if a value is a valid AppState.
 *
 * @param value - The value to check
 * @returns true if value is a valid AppState
 *
 * @example
 * ```typescript
 * const data = JSON.parse(localStorage.getItem('appState'));
 * if (isAppState(data)) {
 *   // TypeScript knows data is AppState
 *   console.log(`Loaded ${data.boxes.length} boxes`);
 * } else {
 *   // Invalid data, use default
 *   const state = createDefaultAppState();
 * }
 * ```
 */
export function isAppState(value: unknown): value is AppState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    'boxes' in value &&
    'flavors' in value &&
    'favoriteFlavorId' in value &&
    'settings' in value &&
    typeof (value as AppState).version === 'number' &&
    (value as AppState).version >= 1 &&
    Number.isInteger((value as AppState).version) &&
    Array.isArray((value as AppState).boxes) &&
    Array.isArray((value as AppState).flavors) &&
    (value as AppState).boxes.every(isBox) &&
    (value as AppState).flavors.every(isFlavor) &&
    ((value as AppState).favoriteFlavorId === null ||
      typeof (value as AppState).favoriteFlavorId === 'string') &&
    typeof (value as AppState).settings === 'object' &&
    (value as AppState).settings !== null
  );
}

/**
 * Creates a default empty AppState.
 * Useful for initialization and fallback when loading from storage fails.
 *
 * @returns A new empty AppState object with current schema version
 */
export function createDefaultAppState(): AppState {
  return {
    version: 1,
    boxes: [],
    flavors: [],
    favoriteFlavorId: null,
    settings: {},
  };
}
